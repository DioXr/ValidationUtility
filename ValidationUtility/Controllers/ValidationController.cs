using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using QAUtility.Models;
using QAUtility.Services;

namespace QAUtility.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // This makes your URL something like /api/validation
    public class ValidationController : ControllerBase
    {
        private readonly IGeminiValidationService _geminiService;

        public ValidationController(IGeminiValidationService geminiService)
        {
            _geminiService = geminiService;
        }

        // Add this new endpoint to simulate fetching from the "other app"
        [HttpGet("fetch-external")]
        public IActionResult FetchExternalQuestions()
        {
            // Pretend this data came from another database or API
            var mockQuestionsFromOtherApp = new List<ValidationRequest>
            {
                // Question 1: Perfectly correct. The AI should mark this VALID.
                new ValidationRequest {
                    Id = "Q101",
                    QuestionTitle = "What is the correct HTML element for inserting a line break?",
                    OptionA = "<break>", OptionB = "<br>", OptionC = "<lb>", OptionD = "<newline>",
                    Answer = "B"
                },

                // Question 2: Incorrect Answer Key. The teacher put 'A', but it should be 'C'.
                new ValidationRequest {
                    Id = "Q102",
                    QuestionTitle = "Which CSS property is used to change the background color?",
                    OptionA = "color", OptionB = "bgcolor", OptionC = "background-color", OptionD = "background",
                    Answer = "A"
                },

                // Question 3: Incorrect Answer Key. The teacher put 'A', but it should be 'C'.
                new ValidationRequest {
                    Id = "Q103",
                    QuestionTitle = "Inside which HTML element do we put the JavaScript?",
                    OptionA = "<javascript>", OptionB = "<scripting>", OptionC = "<script>", OptionD = "<js>",
                    Answer = "A"
                },

                // Question 4: Perfectly correct.
                new ValidationRequest {
                    Id = "Q104",
                    QuestionTitle = "Which CSS property controls the text size?",
                    OptionA = "font-size", OptionB = "text-size", OptionC = "text-style", OptionD = "font-style",
                    Answer = "A"
                },

                // Question 5: Factually tricky. 'C' is not a real HTML tag. AI should correct it to 'A'.
                new ValidationRequest {
                    Id = "Q105",
                    QuestionTitle = "Choose the correct HTML element to define important text.",
                    OptionA = "<strong>", OptionB = "<b>", OptionC = "<important>", OptionD = "<i>",
                    Answer = "C"
                },

                // Question 6: Bad Options. The correct answer (alert) isn't even in the options, and the answer key is wrong.
                new ValidationRequest {
                    Id = "Q106",
                    QuestionTitle = "How do you write 'Hello World' in an alert box in JavaScript?",
                    OptionA = "msgBox('Hello World');", OptionB = "msg('Hello World');", OptionC = "console.log('Hello World');", OptionD = "document.write('Hello World');",
                    Answer = "D"
                }
            };

            // Return the list as a clean JSON response
            return Ok(mockQuestionsFromOtherApp);
        }


        [HttpPost("validate")]
        // 1. THE FIX: Change the parameter to expect the new BatchValidationRequest wrapper
        public async Task<IActionResult> ValidateQuestions([FromBody] BatchValidationRequest request)
        {
            // 2. SAFETY CHECK: Ensure the payload isn't completely empty or missing questions
            if (request == null || request.Questions == null || request.Questions.Count == 0)
            {
                return BadRequest("Invalid payload. Please provide a selected model and a list of questions.");
            }

            // 3. PASS IT ON: Hand the entire wrapper over to our updated service
            var results = await _geminiService.ValidateBatchAsync(request);

            return Ok(results);
        }
    }
}