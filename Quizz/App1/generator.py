from google import genai 
import os
from pydantic import Field, BaseModel

class Problem(BaseModel):
    question: str = Field(description="The question that will be asked based on the prompt given. Maintain the structure of the question in case they contain code, tables, tree maps, etc.")
    options: list[str] = Field(description="Options given to respective question")
    answer: str = Field(description="Answer to the questions which is available in given options")
    explanation: str = Field(description="Why is that option correct? Justify your answer. Keep the explanation concise.")
    topic: str  = Field(description="Name of the topic on which the prompt is on")

class ProblemSet(BaseModel):
    problems: list[Problem] = Field(description="List of quiz questions asked on the topic and format the text according to the question. like for example if the problem is on a code then that code should have proper indentation and structure. For easy difficulty the questions should follow 2:2:1 ratio of easy:medium:hard respectively, for medium 1:2:2 and for hard 0:1:4. If the prompt mentions certain type of problems, try giving those type of problems and also make sure the order of the questions is not ordered by their difficulty. Make the options difficult to choose.")

def generate(query, model, num_questions, difficulty):
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    response = client.models.generate_content(
        model = model,
        contents = query + f'of {num_questions} questions' + f'on {difficulty} mode',
        config={
            'response_mime_type':'application/json',
            'response_schema': ProblemSet
        }
    )

    problem_set = response.parsed
    return(problem_set.problems)