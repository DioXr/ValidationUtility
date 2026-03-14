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