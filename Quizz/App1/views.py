from django.shortcuts import render, redirect
from django.urls import reverse
from . import generator
from django.http import JsonResponse
import json
# Create your views here.

def home(request):
    try:
        if request.method=='POST':
            prompt = request.POST.get('prompt')
            num_questions = request.POST.get('num_questions')
            difficulty = request.POST.get('difficulty')
            model = request.POST.get('model')
            global problems
            problems = generator.generate(prompt, model, num_questions, difficulty)
            request.session['answered'] = [False]*len(problems)
            request.session['score'] = [0]*len(problems)
            return redirect(reverse('App1:view'))
        return render(request, 'App1/promptPage.html')
    except Exception as e:
        return render(request, 'App1/error.html', {'title': type(e).__name__, 'message': str(e)})


def view(request):
    try:
        if request.method=='POST':
            choice = request.POST.get('option')
            ind = request.POST.get('ind')
            ind = int(ind)
            if 'next' in request.POST:
                if ind<len(problems)-1:
                    validateAnswer(request, ind, choice)
                    ind += 1
                    return render(request, 'App1/problem.html', {'problem':getProblem(ind), 'ind':ind})
                else:
                    validateAnswer(request, ind, choice)
                    return redirect(reverse('App1:result'))
            elif 'prev' in request.POST:
                if ind>0:
                    validateAnswer(request, ind, choice)
                    ind-=1
                    return render(request, 'App1/problem.html', {'problem':getProblem(ind), 'ind':ind})
                else:
                    return render(request, 'App1/problem.html', {'problem':getProblem(0), 'ind':0})
            else:
                res = validateAnswer(request, ind, choice)
                return render(request, 'App1/problem.html', {'problem':getProblem(ind), 'res':res, 'ind':ind, 'show':True})

        if request.method=='GET':

            return render(request, 'App1/problem.html', {'problem':getProblem(0), 'ind':0})
    
    except Exception as e:
        return render(request, 'App1/error.html', {'title': type(e).__name__, 'message': str(e)})


def result(request):
    try:
        return render(request, 'App1/result.html', {'correct':sum(request.session['score']), 'total':len(problems), 'problems':problems})
    except Exception as e:
        return render(request, 'App1/error.html', {'title': type(e).__name__, 'message': str(e)})


def getProblem(ind):
    problem = {
            'question': problems[ind].question,
            'options' : problems[ind].options,
            'answer' : problems[ind].answer,
            'explanation' : problems[ind].explanation,
            'topic' : problems[ind].topic
        }
    
    return problem

def validateAnswer(request, ind, choice):
    res = True
    if choice==None: return False
    choice = int(choice)
    if problems[ind].options[choice]==problems[ind].answer:
        res = True
        request.session['score'][ind] = 1
    else:
        res = False
        request.session['score'][ind] = 0
    request.session.modified = True
    print(request.session['score'])
    return res