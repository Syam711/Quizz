from django.shortcuts import render, redirect
from django.urls import reverse
from . import generator
# Create your views here.

def home(request):
    if request.method=='POST':
        prompt = request.POST.get('prompt')
        global problems
        problems = generator.generate(prompt) 
        request.session['answered'] = [0]*len(problems)
        return redirect(reverse('App1:view'))
    return render(request, 'App1/promptPage.html')

def view(request):
    if request.method=='POST':
        choice = request.POST.get('option')
        ind = request.POST.get('ind')
        ind = int(ind)
        if 'next' in request.POST:
            if ind<len(problems)-1:
                ind += 1
                return render(request, 'App1/problem.html', {'problem':problems[ind], 'ind':ind})
            else:
                return render(request, 'App1/result.html', {'correct':sum(request.session['answered']), 'total':len(problems)})
        elif 'prev' in request.POST:
            if ind>0:
                ind-=1
                return render(request, 'App1/problem.html', {'problem':problems[ind], 'ind':ind})
            else:
                return render(request, 'App1/problem.html', {'problem':problems[0], 'ind':0})
        else:
            res = True
            choice = int(choice)
            if problems[ind].options[choice]==problems[ind].answer:
                res = True
                request.session['answered'][ind] = 1
            else:
                res = False
                request.session['answered'][ind] = 0
            request.session.modified = True
            print(request.session['answered'])
            return render(request, 'App1/problem.html', {'problem':problems[ind], 'res':res, 'ind':ind, 'show':True})
    return render(request, 'App1/problem.html', {'problem':problems[0], 'ind':0})

def result(request):
    return