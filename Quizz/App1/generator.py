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
    problems: list[Problem] = Field(description="List of quizz questions asked on the topic and format the text according to the question. like for example if the problem is on a code then that code should have proper indentation and structure. The difficulty of questions should follow 2:2:1 ratio of easy:medium:hard respectively, unless the difficulty is mentioned in the prompt.")

def generate(query):
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    response = client.models.generate_content(
        model = "gemini-2.5-pro",
        contents = query,
        config={
            'response_mime_type':'application/json',
            'response_schema': ProblemSet
        }
    )

    problem_set = response.parsed
    return(problem_set.problems)