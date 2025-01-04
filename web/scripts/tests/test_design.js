import { Design } from "../design.js";
import { PreviewCanvas } from "../preview-canvas.js";

describe('Exporter', function() {
    this.timeout(30000)
    it('Should export the weasel design as expected', async function() {
        const cvs = new PreviewCanvas(document.getElementById("preview-canvas"));
        const image = await fetch('images/example-weasel.svg');
        const svg_doc = new DOMParser().parseFromString(
            await image.text(),
            "image/svg+xml"
        );

        const design = new Design(cvs, svg_doc);
        const footprint = await design.generate_footprint();

        assert(true);
    })
})
