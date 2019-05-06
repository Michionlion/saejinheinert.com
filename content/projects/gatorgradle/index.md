---
title: "GatorGradle"
layout: "full-content"
---

<script text="text/javascript">
function resize(iframe) {
    var fullElementId = "gatorgradle-website"
    var content = document.getElementById("content");
    var fullElement = document.getElementById(fullElementId);
    content.style.padding = 0;
    content.style.margin = 0;

    fullElement.style.height = 0 + "px";
    fullElement.style.width = 0 + "px";
    iframe.style.width = 0 + "px";
    iframe.style.height = 0 + "px";

    console.log("resized");
    fullElement.style.height = content.clientHeight + "px";
    fullElement.style.width = content.clientWidth + "px";
    iframe.style.width = content.clientWidth + "px";
    iframe.style.height = content.clientHeight + "px";
}
</script>

<div id="gatorgradle-website" class="full-content">
    <iframe id="website-iframe" frameborder="0" src="https://gatoreducator.github.io/gatorgradle/">
Failed to display project --- visit the
[GatorGradle](https://gatoreducator.github.io/gatorgradle/)
website for more information!
    </iframe>
</div>

<style type="text/css">
#gatorgradle-website {
    overflow:hidden;
}
</style>

<script defer="defer" text="text/javascript">

iframe = document.getElementById("website-iframe");
window.addEventListener("resize", function(){resize(iframe);});
resize(iframe);
</script>
