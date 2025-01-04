import { Design, Layer } from "./design.js";
import { PreviewCanvas } from "./preview-canvas.js";
import { DropTarget } from "./dragdrop.js";


let cvs = undefined;
let design = undefined;

async function load_design_file(file) {
    if (cvs === undefined) {
        cvs = new PreviewCanvas(document.getElementById("preview-canvas"));
    }

    const svg_doc = new DOMParser().parseFromString(
        await file.text(),
        "image/svg+xml"
    );

    design = new Design(cvs, svg_doc);

    window.dispatchEvent(new CustomEvent("designloaded", { detail: design }));
}

new DropTarget(document.querySelector("body"), async (files) => {
    console.log(files);
    const image_file = files[0];

    if (image_file.type !== "image/svg+xml") {
        console.log(`Expected svg, got ${image_file.type}`);
        return;
    }

    await load_design_file(image_file);
});

document.addEventListener("alpine:init", () => {
    Alpine.data("app", () => ({
        mask_colors: Design.mask_colors,
        silk_colors: Design.silk_colors,
        layers: Design.layer_defs.map((prop) => {
            return { name: prop.name, visible: true };
        }),
        design: false,
        current_layer: "FSilkS",
        toggle_layer_visibility(layer) {
            layer.visible = design.toggle_layer_visibility(layer.name);
            design.draw(cvs);
        },
        designloaded(e) {
            this.design = e.detail;
        },
        exporting: false,
        async export_design(method) {
            this.exporting = true;
            await this.design.export(method);
            this.exporting = 'done';
            window.setTimeout(() => {
                this.exporting = false;
            }, 3000);
        },
        async load_example_design(name) {
            await load_design_file(await fetch(name));
        },
    }));
});
