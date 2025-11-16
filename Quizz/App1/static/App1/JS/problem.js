const rightResponses = [
    "Correct!",
    "Spot on!",
    "That’s right!",
    "Perfect answer!",
    "Well done!",
    "Excellent!",
    "You nailed it!",
    "Absolutely correct!",
    "Great job!",
    "Exactly right!",

    "Your effort shows — great job!",
    "Beautifully done!",
    "You’re doing amazing!",
    "Love to see it!",
    "You understood that perfectly!",

    "Boom! Nailed it!",
    "Brain: 100%. Answer: 100%.",
    "You hit that like a pro!",
    "You cracked it wide open!",

    "Critical hit!",
    "Victory secured!",
    "Clean execution!",
    "Your skill level just went up!",
    "Achievement unlocked: Correct Answer!",

    "Look at you being all correct!",
    "Someone’s on fire today!",
    "Wow, a braincell well used!",
    "Correct — shocking, I know.",
    "You actually got it? Respect.",

    "YES! That’s it!",
    "Bang! Right answer!",
    "Sharp thinking!",
    "Locked in and correct!",
    "That’s what I’m talking about!",

    "Clean and accurate.",
    "Right on the money.",
    "Flawless."
];

const wrongResponses = [
    "That’s not correct.",
    "Incorrect.",
    "Not the right answer.",
    "That missed the mark.",
    "That’s off.",

    "Hmm, that isn’t quite right.",
    "Not what we’re looking for.",
    "That doesn’t match the expected answer.",
    "Close, but not correct.",
    "That doesn’t seem accurate.",

    "Your answer tripped and fell.",
    "That answer needs therapy.",
    "Your logic went on vacation.",
    "The answer escaped you today.",

    "Bold answer… but wrong.",
    "That’s a choice. Not a correct one.",
    "Your answer is... interestingly incorrect.",
    "You missed harder than WiFi during a storm.",
    "Incorrect — but confidently delivered!",

    "Missed your shot.",
    "That’s a failed quest.",
    "Oof — damage taken.",
    "That move didn’t land.",

    "That answer has been rejected by the universe.",
    "Plot twist: that was wrong.",
    "Your answer just rage quit.",
    "Your brain lagged for a second.",
    "The answer gods say: denied.",

    "That is not the correct solution.",
    "The response is inaccurate.",
    "Your answer does not align with the requirement.",
    "That’s the wrong option.",
    "The result is incorrect."
];

function getRightResponse() {
    return rightResponses[Math.floor(Math.random() * rightResponses.length)];
}

function getWrongResponse() {
    return wrongResponses[Math.floor(Math.random() * wrongResponses.length)];
}

let form = document.querySelector('form')
let problem = JSON.parse(document.querySelector('#problem').textContent)
form.addEventListener("submit", (e)=>{
    let clicked = e.submitter
    let data = new FormData(form)
    let option = data.get('option')

    if (clicked.name==='submit'){
        e.preventDefault()
        let results = document.querySelector('.results')
        let heading = results.querySelector('h3')
        let aside = document.querySelector('aside')
        console.log(option, problem.answer, problem.options[option])
        if (problem.answer==problem.options[option]) heading.innerText = getRightResponse()
        else heading.innerText = getWrongResponse()
        results.style.display = 'block'
        aside.style.display = 'flex'
    }
    
    console.log(problem)
})

let ind = document.getElementById('ind').textContent
if (ind==0){
    let prev = document.querySelector('#prev')
    prev.disabled = true
}


