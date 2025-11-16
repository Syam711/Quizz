let form = document.querySelector('form')

form.addEventListener("submit", (e)=>{
    e.preventDefault();

    let loading = document.querySelector('.loading')
    let loading_container = document.querySelector('.loading-container')
    let container = document.querySelector('.container')
    container.style.display = 'none'
    loading_container.style.display = 'flex'
    loading.style.display = `flex`
    form.submit()
    let ind = 0;
    let lt = ['Fetching your request...', 'Processing your request...', 'Creating your environment...', 'Almost there...']
    let show = document.querySelector('.loading-text')

    function showNextText() {
        if (ind<lt.length){
            show.innerText = lt[ind]
            ind++   
        }
        else{
            clearInterval(showNextText)
        }
    }

    showNextText();

    setInterval(showNextText, 2000);
})