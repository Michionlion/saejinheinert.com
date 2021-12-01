---
title: "Resume"
layout: "full-content"
---
<style>
  #content {
    padding: 0;
    margin: 0;
  }
</style>

<div id="resume-pdf" class="full-content">
  <object data="/resume.pdf" type="application/pdf">
    <embed src="/resume.pdf" type='application/pdf'>
      Unable to display - <a href="/resume.pdf">Download</a>
    </embed>
  </object>
</div>

<script defer type="text/javascript">
function resize() {
  const resume = document.getElementById('resume-pdf');
  const content = document.getElementById('content');
  resume.style.height = `1px`;
  resume.style.height = content.offsetHeight + 'px';
}

resize();
window.addEventListener('resize', resize);
</script>
