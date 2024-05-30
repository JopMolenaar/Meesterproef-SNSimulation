export default class Edge {
    constructor(from, to, type) {
        this.from = from;
        this.to = to;
        this.type = type;
        this.element = null;
        this.drawLink();
    }

    drawLink() {
        let linkStripe = document.createElement("div");
        this.element = linkStripe;
        linkStripe.className = "linkStripe";
        linkStripe.style.position = "absolute";

        this.calcAngle();

        linkStripe.classList.add(this.type);

        canvasContainer.appendChild(linkStripe);

        return linkStripe;
    }

    calcAngle() {
        let Ydifference = this.from.y - this.to.y;
        let Xdifference = this.from.x - this.to.x;

        let linkLength = Math.sqrt(Math.pow(Ydifference, 2) + Math.pow(Xdifference, 2));
        let linkAngle = Math.atan2(Ydifference, Xdifference) + Math.PI;
        this.element.style.width = linkLength + "px";
        this.element.style.transform = "translateY(-50%) rotate(" + linkAngle + "rad)";
        this.element.style.left = this.from.x + "px";
        this.element.style.top = this.from.y + "px";
    }
}