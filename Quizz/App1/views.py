from django.shortcuts import render, redirect
from django.urls import reverse
from . import generator
# Create your views here.

def home(request):
    if request.method=='POST':
        prompt = request.POST.get('prompt')
        global problems
        problems = generator.generate(prompt)
        print(len(problems))
        return redirect(reverse('view'))
    return render(request, 'App1/promptPage.html')

def view(request):
    answered = [0]*len(problems)
    if request.method=='POST':
        move = request.POST.get('move')
        choice = request.POST.get('option')
        prev = request.POST.get('ind')
        sub = request.POST.get('ind')
        next = request.POST.get('ind')
        if next:
            ind = prev
            if ind<len(problems):
                ind += 1
                return render(request, 'App1/problem.html', {'problem':problems[ind], 'ind':ind})
            else:
                return render(request, 'App1/result.html', {'correct':sum(answered), 'total':len(problems)})
        elif prev:
            ind = prev
            if ind>0:
                ind-=1
                return render(request, 'App1/problem.html', {'problem':problems[ind], 'ind':ind})
            else:
                ind = 0
                return render(request, 'App1/problem.html', {'problem':problems[0], 'ind':ind})
        else:
            ind = sub
            res = True
            choice = int(choice)
            if problems[ind].options[choice]==problems[ind].answer:
                res = True
                answered[ind] = 1
            else:
                res = False
                answered[ind] = 0
            return render(request, 'App1/problem.html', {'problem':problems[ind], 'res':res, 'ind':ind})
    return render(request, 'App1/problem.html', {'problem':problems[0], 'ind':0})

def result(request):
    return