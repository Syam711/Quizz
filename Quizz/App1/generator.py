from google import genai 
import os
from pydantic import Field, BaseModel

class Problem(BaseModel):
    question: str = Field(description=
                          "The question content. **Crucially, maintain the exact original formatting, structure, and indentation** "
                          "if the question contains code blocks, tables, diagrams, or specific patterns. Use LaTeX for mathematical content."
                        )
    options: list[str] = Field(description=
                               "Options given to respective question"
                               "Ensure options are ambiguous and the final question order is mixed difficulty."
                               )
    answer: str = Field(description="Answer to the questions which is available in given options")
    explanation: str = Field(description="Why is that option correct? Justify your answer. Keep the explanation concise. Maintain code formatting if explaining code.")
    topic: str  = Field(description="Name of the topic on which the prompt is on")

class ProblemSet(BaseModel):
    problems: list[Problem] = Field(description=
                                    "List of quiz questions. **Ensure the formatting, structure, and patterns of the content are strictly preserved** "
                                    "within the 'question' field, including proper code indentation, table markdown, or LaTeX usage. "
                                    "Follow the difficulty ratio (Easy:Medium:Hard) and avoid ordering by difficulty.")

def generate(query, model, num_questions, difficulty):
    difficulty_ratio = {
        'easy': '2:2:1 (easy:medium:hard)',
        'medium': '1:2:2 (easy:medium:hard)',
        'hard': '0:2:3 (easy:medium:hard)',
    }
    ratio_info = difficulty_ratio.get(difficulty.lower(), 'easy')
    full_query = (
        f"Generate a quiz of exactly {num_questions} questions on the topic/content: '{query}'. "
        f"The difficulty mode is '{difficulty}' of ratio {ratio_info}. Follow all constraints in the schema."
    )
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    for i in range(4):
        try:
            response = client.models.generate_content(
                model = model,
                contents = full_query ,
                config={
                    'response_mime_type':'application/json',
                    'response_schema': ProblemSet
                }
            )
            problem_set = response.parsed
            return(problem_set.problems)
        except Exception as e:
            print(e)
            if i==2:
                full_query = query + "Don't generate the explanations, instead place 'Not Available' "
            else:
                raise e