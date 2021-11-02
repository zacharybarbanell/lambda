var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});



function draw() {
	ctx.fillStyle = "blue";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	window.requestAnimationFrame(draw);
}
