from django.shortcuts import render, redirect
from django.urls import reverse
from . import generator
# Create your views here.

def home(request):
    if request.method=='POST':
        prompt = request.POST.get('prompt')
        request.session['problems'] = generator.generate(prompt)
        return redirect(reverse('view'))
    return render(request, 'App1/promptPage.html')

def view(request):
    if request.method=='POST':
        ind = request.POST.get('ind')
    return render(request, 'App1/problem.html', {'problem':request.session.get('problems', [])[0]})