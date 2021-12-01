function setupMenu() {
  let directories = document.querySelectorAll('.directory');
  for (let dir of directories) {
    let link = dir.querySelector('.directory-link');
    link.addEventListener('click', () => dir.classList.toggle('open'));
  }
}

function setupLinks() {
  for (let element of document.querySelectorAll('.page-link')) {
    if (element.hasAttribute('href')) {
      element.addEventListener(
        'click',
        () => (window.location.href = element.getAttribute('href'))
      );
    }
  }
}

setupMenu();
setupLinks();
