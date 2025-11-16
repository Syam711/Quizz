let review = document.querySelector('#review')
let toReview = document.querySelector('#toReview')
toReview.addEventListener('click', (e)=>{
    review.style.display = 'block'
})

let circle = document.querySelector('.circle')
let correct = document.querySelector('#correct').textContent
let total = document.querySelector('#total').textContent
let per = correct/total

if (per<0.3) circle.style.backgroundColor = `rgba(202, 0, 0, 1)`
else if (per<0.6) circle.style.backgroundColor = `rgba(202, 108, 0, 1)`
else circle.style.backgroundColor = `rgba(0, 198, 0, 1)`