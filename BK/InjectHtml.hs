// Create textarea for input
const textarea = document.createElement('textarea');
textarea.rows = 40;
textarea.cols = 50;
document.body.appendChild(textarea);

// Button to inject HTML
const button = document.createElement('button');
button.textContent = 'Inject HTML';
button.onclick = function() {
  const injectedHtml = textarea.value;
  document.documentElement.insertAdjacentHTML('afterbegin', injectedHtml);
  textarea.value = '';
  alert('HTML injected successfully!');
};
document.body.appendChild(button);
