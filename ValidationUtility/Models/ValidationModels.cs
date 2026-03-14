using System.Collections.Generic;

namespace QAUtility.Models
{
    // 1. THE NEW BATCH WRAPPER
    public class BatchValidationRequest
    {
        public string SelectedModel { get; set; }
        public string BatchReferenceText { get; set; }
        public List<ValidationRequest> Questions { get; set; }
    }

    // 2. THE INDIVIDUAL QUESTION
    public class ValidationRequest
    {
        public string QuestionTitle { get; set; }
        public string OptionA { get; set; }
        public string OptionB { get; set; }
        public string OptionC { get; set; }
        public string OptionD { get; set; }
        public string Answer { get; set; }
    }

    // 3. THE RESULT
    public class ValidationResult
    {
        public string QuestionText { get; set; }
        public bool IsFactuallyCorrect { get; set; }
        public string Explanation { get; set; }
        public string SuggestedCorrection { get; set; }
    }
}