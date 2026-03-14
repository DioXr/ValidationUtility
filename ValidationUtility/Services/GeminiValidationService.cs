using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using QAUtility.Models;

namespace QAUtility.Services
{
    public class GeminiValidationService : IGeminiValidationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiValidationService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiSettings:ApiKey"] ?? "";
        }

        private string CleanText(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            string clean = Regex.Replace(text, "<.*?>", string.Empty);
            return clean.Replace("\\", "\\\\").Trim();
        }

        public async Task<List<ValidationResult>> ValidateBatchAsync(BatchValidationRequest request)
        {
            var finalResults = new List<ValidationResult>();

            // 1. Safety Check
            if (request == null || request.Questions == null || !request.Questions.Any())
                return finalResults;

            // 2. Limit to 10 questions to protect token limits
            var batch = request.Questions.Take(10).ToList();

            // 3. DYNAMIC MODEL SWITCHING
            string modelId = request.SelectedModel?.ToLower() switch
            {
                // The fast, lightweight model
                "gemini-1.5-flash" => "gemini-1.5-flash",

                // The newer standard model (great default)
                "gemini-2.5-flash" => "gemini-2.5-flash",

                // The heavy-duty model for complex logical questions
                "gemini-flash-latest" => "gemini-flash-latest",

                // The safety net: if the UI accidentally sends a blank or weird name, use 2.5 Flash
                _ => "gemini-flash-latest"
            };

            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key={_apiKey}";

            // 4. Serialize just the questions for the AI
            var questionsPayload = batch.Select((req, index) => new {
                Id = index,
                Question = CleanText(req.QuestionTitle),
                A = CleanText(req.OptionA),
                B = CleanText(req.OptionB),
                C = CleanText(req.OptionC),
                D = CleanText(req.OptionD),
                TeacherKey = req.Answer?.ToUpper()
            });
            string serializedQuestions = JsonSerializer.Serialize(questionsPayload);

            // 5. GROUNDING (REFERENCE TEXT) INJECTION
            string referenceInstruction = "";
            if (!string.IsNullOrWhiteSpace(request.BatchReferenceText))
            {
                referenceInstruction = $@"
                GROUNDING RULE: You MUST use the following reference material as your ABSOLUTE SOURCE OF TRUTH. 
                If the TeacherKey contradicts this text, mark it as false and explain why based on this text.
                
                --- START REFERENCE MATERIAL ---
                {CleanText(request.BatchReferenceText)}
                --- END REFERENCE MATERIAL ---
                ";
            }

            // 6. BUILD THE PROMPT
            var promptText = $@"
                You are a PhD-level Subject Matter Expert. 
    1. Identify the language of each question and respond in that same language.
    2. If math/LaTeX is present, solve it step-by-step internally.
    {referenceInstruction}
    
    Evaluate the following batch of multiple-choice questions:
    {serializedQuestions}

    Return ONLY a raw JSON array of objects in the EXACT same order.
    
    JSON Array Format Required:
    [
      {{
        ""isFactuallyCorrect"": true/false,
        ""explanation"": ""Provide a detailed, human-like reasoning for why the answer is correct or incorrect based on the subject matter."",
        ""suggestedCorrection"": ""ALWAYS provide this field. Format: 'Correct Option: [X] - [Option Text]. Followed by a detailed explanation.'""
      }}
    ]
    
    IMPORTANT: 
    - You MUST fill 'suggestedCorrection' for EVERY question, even if the TeacherKey is correct.
    - If the TeacherKey is correct, 'suggestedCorrection' should confirm the correct choice and add extra detail.
    - Ensure all backslashes in math formulas are double-escaped. Use \n for line breaks inside strings.";

            // 7. API CALL & RETRY LOGIC
            int maxRetries = 3;
            bool requestSuccessful = false;

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                if (requestSuccessful) break;

                try
                {
                    var payload = new { contents = new[] { new { parts = new[] { new { text = promptText } } } } };
                    var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                    var response = await _httpClient.PostAsync(geminiUrl, jsonContent);
                    var responseString = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        var node = JsonNode.Parse(responseString);
                        var aiRawText = node["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString() ?? "";

                        // 8. CLEAN AI RESPONSE (Prevents 0x0A crashes)
                        aiRawText = Regex.Replace(aiRawText, "```json|```", "").Trim();
                        aiRawText = aiRawText.Replace("\r", "").Replace("\n", " ");

                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var resultsArray = JsonSerializer.Deserialize<List<ValidationResult>>(aiRawText, options);

                        // 9. MAP RESULTS BACK TO ORIGINAL QUESTIONS
                        if (resultsArray != null)
                        {
                            for (int i = 0; i < Math.Min(batch.Count, resultsArray.Count); i++)
                            {
                                resultsArray[i].QuestionText = CleanText(batch[i].QuestionTitle);
                                finalResults.Add(resultsArray[i]);
                            }
                        }
                        requestSuccessful = true;
                    }
                    else
                    {
                        int statusCode = (int)response.StatusCode;
                        if (statusCode == 429)
                        {
                            if (attempt >= maxRetries) throw new Exception($"Quota Error: {statusCode}");
                            await Task.Delay(15000); // Backoff for Rate Limit
                        }
                        else if (statusCode == 400 || statusCode == 403 || statusCode == 404)
                        {
                            attempt = maxRetries; // Fail fast
                            throw new Exception($"Fatal API Error: {statusCode}");
                        }
                        else
                        {
                            if (attempt >= maxRetries) throw new Exception($"Server Error: {statusCode}");
                            await Task.Delay(5000);
                        }
                    }
                }
                catch (Exception ex)
                {
                    if (attempt >= maxRetries)
                    {
                        foreach (var req in batch)
                        {
                            finalResults.Add(new ValidationResult
                            {
                                QuestionText = CleanText(req.QuestionTitle),
                                IsFactuallyCorrect = false,
                                Explanation = $"System Failure: {ex.Message}",
                                SuggestedCorrection = $"Validation failed using model: {modelId}."
                            });
                        }
                    }
                }
            }

            return finalResults;
        }
    }
}