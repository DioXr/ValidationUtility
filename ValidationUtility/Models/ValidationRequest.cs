namespace QAUtility.Models
{
    // This represents a single question coming IN from the quiz app.
    public class ValidationRequest
    {
        public string QuestionText { get; set; }

        // empty list if no options
        // supports no options
        public List<string> Options { get; set; } = new List<string>();

        public string PredefinedAnswer { get; set; }
    }
}