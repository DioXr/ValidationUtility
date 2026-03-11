using Microsoft.AspNetCore.Mvc;
using QAUtility.Models;
using QAUtility.Services; // Add this using statement

namespace QAUtility.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ValidationController : ControllerBase
    {
        private readonly IGeminiValidationService _aiService;

        // The service is automatically "injected" into the controller here
        public ValidationController(IGeminiValidationService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("validate-batch")]
        public async Task<IActionResult> ValidateBatch([FromBody] List<ValidationRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest("The request batch cannot be empty.");
            }

            if (requests.Count > 10)
            {
                return BadRequest("Please submit a maximum of 10 questions per batch.");
            }

            // Call AI service and wait for it to finish the loop
            var finalResults = await _aiService.ValidateBatchAsync(requests);

            // Send the real AI results
            return Ok(finalResults);
        }
    }
}