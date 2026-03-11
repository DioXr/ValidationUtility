namespace QAUtility.Models
{
    // This represents the final verdict we send OUT to the quiz app.
    public class ValidationResult
    {
        // We echo the question back so the quiz app knows which result belongs to which question.
        public string QuestionText { get; set; }

        public bool IsFactuallyCorrect { get; set; }
        public string Explanation { get; set; }
        public string SuggestedCorrection { get; set; }
    }
}