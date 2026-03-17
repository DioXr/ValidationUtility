using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using QAUtility.Models;
using QAUtility.Services;

namespace QAUtility.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ValidationController : ControllerBase
    {
        private readonly IGeminiValidationService _geminiService;

        public ValidationController(IGeminiValidationService geminiService)
        {
            _geminiService = geminiService;
        }

        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] BatchValidationRequest request)
        {
            if (request == null || request.Questions == null) return BadRequest("Invalid Request Payload.");

            // Calls your GeminiValidationService
            var results = await _geminiService.ValidateBatchAsync(request);
            return Ok(results);
        }
    }
}