import { Design } from "../design.js";
import { PreviewCanvas } from "../preview-canvas.js";

const { expect } = chai;

describe('Exporter', function() {
    this.timeout(30000)
    it('Should export the weasel design as expected', async function() {
        const cvs = new PreviewCanvas(document.getElementById("preview-canvas"));
        const image = await fetch('images/example-weasel.svg');
        const svg_doc = new DOMParser().parseFromString(
            await image.text(),
            "image/svg+xml"
        );

        console.log(svg_doc)

        const expectedPromise = fetch('scripts/tests/weasel.kicad_pcb').then(resp => resp.text())
        const design = new Design(cvs, svg_doc);
        const footprint = await design.generate_footprint();
        console.log(footprint);

        expect(footprint).to.equal(await expectedPromise);
    })
})
