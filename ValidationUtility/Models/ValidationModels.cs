using System.Collections.Generic;

namespace QAUtility.Models
{
    // The main package that comes from the UI
    public class BatchValidationRequest
    {
        public string SelectedModel { get; set; }
        public string BatchReferenceText { get; set; }
        public List<ValidationRequest> Questions { get; set; }
    }

    // The shape of a single question coming IN
    public class ValidationRequest
    {
        public string Id { get; set; }
        public string QuestionTitle { get; set; }
        public string OptionA { get; set; }
        public string OptionB { get; set; }
        public string OptionC { get; set; }
        public string OptionD { get; set; }
        public string OptionE { get; set; }
        public string Answer { get; set; }
    }

    // The shape of the AI result going OUT
    public class ValidationResult
    {
        public string QuestionId { get; set; } // Links back to the UI row
        public bool IsFactuallyCorrect { get; set; }
        public string Explanation { get; set; }
        public string SuggestedCorrection { get; set; }
    }
}