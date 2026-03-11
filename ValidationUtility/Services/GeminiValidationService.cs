using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
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
            _apiKey = configuration["GeminiSettings:ApiKey"];
        }

        public async Task<List<ValidationResult>> ValidateBatchAsync(List<ValidationRequest> requests)
        {
            var finalResults = new List<ValidationResult>();

            // Gemini model link
            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={_apiKey}";
            foreach (var request in requests)
            {
                // 1. Build the Instructions (The Prompt)
                var promptText = $@"
                    You are an expert educational validator. 
                    Check if the teacher's answer is factually correct.
                    
                    Question: {request.QuestionText}
                    Options: {string.Join(", ", request.Options)}
                    Teacher's Correct Answer: {request.PredefinedAnswer}

                    Return ONLY a raw JSON object with these keys:
                    'isFactuallyCorrect' (boolean),
                    'explanation' (string),
                    'suggestedCorrection' (string or null)
                    Do not include markdown or extra text.
                ";

                // 2. Build the Payload
                // We removed 'generationConfig' to avoid the BadRequest error we saw earlier.
                var payload = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = promptText } } }
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // 3. Call the API
                var response = await _httpClient.PostAsync(geminiUrl, content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var parsedNode = JsonNode.Parse(responseString);
                    var aiJsonText = parsedNode["candidates"][0]["content"]["parts"][0]["text"].ToString();

                    // 4. Clean the AI response
                    // Sometimes AI adds ```json or extra spaces. This removes them.
                    aiJsonText = aiJsonText.Replace("```json", "").Replace("```", "").Trim();

                    try
                    {
                        var resultObj = JsonSerializer.Deserialize<ValidationResult>(aiJsonText, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });

                        resultObj.QuestionText = request.QuestionText;
                        finalResults.Add(resultObj);
                    }
                    catch
                    {
                        // If the AI sends bad JSON format, we record a parsing error
                        finalResults.Add(new ValidationResult
                        {
                            QuestionText = request.QuestionText,
                            IsFactuallyCorrect = false,
                            Explanation = "Error: AI returned an unreadable format.",
                            SuggestedCorrection = null
                        });
                    }
                }
                else
                {
                    // This captures the exact error from Google for debugging
                    finalResults.Add(new ValidationResult
                    {
                        QuestionText = request.QuestionText,
                        IsFactuallyCorrect = false,
                        Explanation = $"Google Error: {response.StatusCode} - {responseString}",
                        SuggestedCorrection = null
                    });
                }
            }

            return finalResults;
        }
    }
}