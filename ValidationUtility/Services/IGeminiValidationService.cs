using System.Collections.Generic;
using System.Threading.Tasks;
using QAUtility.Models;

namespace QAUtility.Services
{
    public interface IGeminiValidationService
    {
        // We changed the parameter from List<ValidationRequest> to BatchValidationRequest
        Task<List<ValidationResult>> ValidateBatchAsync(BatchValidationRequest request);
    }
}