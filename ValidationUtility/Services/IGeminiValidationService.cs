using QAUtility.Models;

namespace QAUtility.Services
{
    // This interface tells the application what the service can do
    public interface IGeminiValidationService
    {
        // A method that takes a list of requests and returns a list of results
        Task<List<ValidationResult>> ValidateBatchAsync(List<ValidationRequest> requests);
    }
}