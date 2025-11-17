const form = document.getElementById('promptForm');
const toggleBtn = document.getElementById('settingsToggle');
const toggleIcon = toggleBtn.querySelector('i');

toggleBtn.addEventListener('click', () => {
    form.classList.toggle('expanded');

    if (form.classList.contains('expanded')) {
        toggleIcon.classList.remove('fa-plus');
        toggleIcon.classList.add('fa-minus');
    } else {
        toggleIcon.classList.remove('fa-minus');
        toggleIcon.classList.add('fa-plus');
    }
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    let loading = document.querySelector('.loading');
    let loading_container = document.querySelector('.loading-container');
    let container = document.querySelector('.container');
    
    container.style.display = 'none';
    loading_container.style.display = 'flex';
    loading.style.display = `flex`;
    
    form.submit();

    let ind = 0;
    let lt = ['Fetching your request...', 'Processing your request...', 'Creating your environment...', 'Almost there...'];
    let show = document.querySelector('.loading-text');

    function showNextText() {
        if (ind < lt.length) {
            show.innerText = lt[ind];
            ind++;
        } else {
            clearInterval(showNextText);
        }
    }
    showNextText();
    setInterval(showNextText, 2000);
});

document.querySelectorAll('.setting-select select').forEach(selectElement => {
    const settingGroup = selectElement.closest('.setting-group');
    const selectedValueSpan = settingGroup.querySelector('.selected-value');

    selectElement.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        selectedValueSpan.textContent = selectedOption.text;
    });

    const initialSelected = selectElement.options[selectElement.selectedIndex];
    if (initialSelected) {
        selectedValueSpan.textContent = initialSelected.text;
    }
});