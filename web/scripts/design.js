import * as yak from "./yak.js";
import { LibGingerbread } from "./libgingerbread.js";

export class Design {
    static mask_colors = {
        green: "rgb(0, 84, 3)",
        red: "rgb(127, 0, 0)",
        yellow: "rgb(207, 184, 0)",
        blue: "rgb(0, 28, 204)",
        white: "white",
        black: "black",
        pink: "pink",
        grey: "grey",
        orange: "orange",
        purple: "rgb(117, 0, 207)",
    };

    static silk_colors = ["white", "black", "yellow", "blue", "grey"];

    static layer_defs = [
        {
            name: "Drill",
            type: "drill",
            selector: "#Drill, #Drills, [*|label=\"Drill\"], [*|label=\"Drills\"]",
            color: "Fuchsia",
        },
        {
            name: "FSilkS",
            type: "raster",
            selector: "#FSilkS, #F\\.SilkS, [*|label=\"FSilkS\"], [*|label=\"F\\.SilkS\"]",
            color: "white",
            number: 3,
        },
        {
            name: "FMask",
            type: "raster",
            selector: "#FMask, #F\\.Mask, [*|label=\"FMask\"], [*|label=\"F\\.Mask\"]",
            color: "black",
            is_mask: true,
            number: 5,
        },
        {
            name: "FCu",
            type: "raster",
            selector: "#FCu, #F\\.Cu, [*|label=\"FCu\"], [*|label=\"F\\.Cu\"]",
            color: "gold",
            number: 1,
        },
        {
            name: "BCu",
            type: "raster",
            selector: "#BCu, #B\\.Cu, [*|label=\"BCu\"], [*|label=\"B\\.Cu\"]",
            color: "gold",
            number: 2,
        },
        {
            name: "BMask",
            type: "raster",
            selector: "#BMask, #B\\.Mask, [*|label=\"BMask\"], [*|label=\"B\\.Mask\"]",
            color: "black",
            is_mask: true,
            number: 6,
        },
        {
            name: "BSilkS",
            type: "raster",
            selector: "#BSilkS, #B\\.SilkS, [*|label=\"BSilkS\"], [*|label=\"B\\.SilkS\"]",
            color: "white",
            number: 4,
        },
        {
            name: "EdgeCuts",
            type: "vector",
            selector: "#EdgeCuts, #Edge\\.Cuts, [*|label=\"EdgeCuts\"], [*|label=\"Edge\\.Cuts\"]",
            color: "PeachPuff",
            force_color: true,
            number: 7,
        },
    ];

    constructor(canvas, svg) {
        this.cvs = canvas;
        this.svg = svg;
        this.svg_template = yak.cloneDocumentRoot(this.svg, "image/svg+xml");
        this._preview_layout = "both";
        this._mask_opacity = 0.9;
        this.initialize_dimensions();
        this.make_layers();
        this.output_dpi = 2540;

        const resize_observer = new ResizeObserver(() => {
            this.cvs.resize_to_container();
            this.draw();
        });
        resize_observer.observe(this.cvs.elm);
    }

    initialize_dimensions() {
        const viewbox = this.svg.documentElement.viewBox.baseVal;

        const pageWidth = this.svg.documentElement.width.baseVal;
        const pageHeight = this.svg.documentElement.height.baseVal;
        // We just use width because the aspect ratios should match,
        // if not the best we can do is log a warning, really
        // Use toFixed because I'm scared of floating points
        const pageAspect = pageWidth.value/pageHeight.value;
        const viewboxAspect = viewbox.width/viewbox.height;
        if(pageAspect.toFixed(2) !== viewboxAspect.toFixed(2)) {
            console.warn("Aspect ratios of page size and viewbox differ! Things will probably look weird!")
        }
        console.log(pageWidth)
        switch(pageWidth.unitType) {
            case SVGLength.SVG_LENGTHTYPE_IN:
            case SVGLength.SVG_LENGTHTYPE_MM:
            case SVGLength.SVG_LENGTHTYPE_CM:
            case SVGLength.SVG_LENGTHTYPE_PT:
            case SVGLength.SVG_LENGTHTYPE_PC:
            case SVGLength.SVG_LENGTHTYPE_PX:
                pageWidth.convertToSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_IN);
                this.dpi = (viewbox.width/pageWidth.valueInSpecifiedUnits).toFixed(1);
                console.log(pageWidth, this.dpi)
                break;
            default:
                // If we don't have a real-world length, just guess
                // Instructions say 2540 so go with that
                this.dpi = 2540
                break;
        }

        //pageWidth.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PERCENTAGE, 100)
        //pageHeight.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PERCENTAGE, 100)

        this.width_px = viewbox.width;
        this.height_px = viewbox.height;
        this.preview_width = Math.max(this.width_px * 0.25, 1024);
        this.raster_width = this.width_px * 0.5;
    }

    make_layers() {
        this.layers = [];
        this.layers_by_name = {};

        for (const layer_def of Design.layer_defs) {
            const layer_doc = this.svg_template.cloneNode(true);
            const layer_elms = this.svg.querySelectorAll(layer_def.selector);

            for (const layer_elm of layer_elms) {
                yak.transplantElement(layer_elm, layer_doc);
            }

            const layer = new Layer(this, layer_doc, layer_def);

            this.layers.push(layer);
            this.layers_by_name[layer_def.name] = layer;
        }
    }

    get dpmm() {
        return 25.4 / this.dpi;
    }

    set dpmm(val) {
        this.dpi = (25.4 / val).toFixed(1);
    }

    get width_mm() {
        return (this.width_px * this.dpmm).toFixed(2);
    }

    set width_mm(val) {
        this.dpmm = val / this.width_px;
    }

    get height_mm() {
        return (this.height_px * this.dpmm).toFixed(2);
    }

    set height_mm(val) {
        this.dpmm = val / this.height_px;
    }

    get output_dpmm() {
        return 25.4 / this.output_dpi;
    }

    get trace_scale_factor() {
        return (this.width_px * this.output_dpmm) / this.raster_width;
    }

    get edge_cuts() {
        return this.layers_by_name["EdgeCuts"];
    }

    get mask_color() {
        return this.layers_by_name["FMask"].color;
    }

    set mask_color(val) {
        this.layers_by_name["FMask"].color = val;
        this.layers_by_name["BMask"].color = val;
        this.draw();
    }

    get mask_opacity() {
        return this._mask_opacity;
    }

    set mask_opacity(val) {
        this._mask_opacity = val;
        this.draw();
    }

    get silk_color() {
        return this.layers_by_name["FSilkS"].color;
    }

    set silk_color(val) {
        this.layers_by_name["FSilkS"].color = val;
        this.layers_by_name["BSilkS"].color = val;
        this.draw();
    }

    get preview_layout() {
        return this._preview_layout;
    }

    set preview_layout(val) {
        this._preview_layout = val;
        this.draw();
    }

    async draw_layers(layers, side) {
        const cvs = this.cvs;

        let i = 0;
        for (const layer_name of layers) {
            const layer = this.layers_by_name[layer_name];

            if (!layer.visible) {
                continue;
            }

            if (layer.is_mask) {
                cvs.ctx.globalAlpha = this.mask_opacity;
            }

            if (this.preview_layout === "both") {
                cvs.draw_image_two_up(await layer.get_preview_bitmap(), side);
            } else if (this.preview_layout.endsWith("-spread")) {
                cvs.draw_image_n_up(
                    await layer.get_preview_bitmap(),
                    i,
                    layers.length
                );
            } else {
                cvs.draw_image(await layer.get_preview_bitmap());
            }

            cvs.ctx.globalAlpha = 1;
            i++;
        }
    }

    async draw() {
        const cvs = this.cvs;

        cvs.clear();

        if (
            this.preview_layout === "front" ||
            this.preview_layout === "front-spread" ||
            this.preview_layout === "both"
        ) {
            await this.draw_layers(
                ["EdgeCuts", "FCu", "FMask", "FSilkS", "Drill"],
                "left"
            );
        }

        if (
            this.preview_layout === "back" ||
            this.preview_layout === "back-spread" ||
            this.preview_layout === "both"
        ) {
            await this.draw_layers(
                ["EdgeCuts", "BCu", "BMask", "BSilkS", "Drill"],
                "right"
            );
        }
    }

    toggle_layer_visibility(layer_name) {
        const layer = this.layers_by_name[layer_name];
        layer.visible = !layer.visible;
        return layer.visible;
    }

    async export(method) {
        const gingerbread = await LibGingerbread.new();
        console.log(gingerbread);

        gingerbread.conversion_start();

        for (const layer of this.layers) {
            switch (layer.type) {
                case "raster":
                    const bm = await layer.get_raster_bitmap();
                    const imgdata = await yak.ImageData_from_ImageBitmap(bm);
                    gingerbread.conversion_add_raster_layer(
                        layer.number,
                        this.trace_scale_factor,
                        imgdata
                    );
                    break;
                case "vector":
                    for (const path of layer.get_paths()) {
                        gingerbread.conversion_start_poly();
                        for (const pt of path) {
                            gingerbread.conversion_add_poly_point(
                                pt[0],
                                pt[1],
                                this.output_dpmm
                            );
                        }
                        gingerbread.conversion_end_poly(layer.number, 1, false);
                    }
                    break;
                case "drill":
                    for (const circle of layer.get_circles()) {
                        gingerbread.conversion_add_drill(
                            circle.cx.baseVal.value,
                            circle.cy.baseVal.value,
                            circle.r.baseVal.value * 2,
                            this.output_dpmm
                        );
                    }
                    break;
                default:
                    throw `Unexpected layer type ${layer.type}`;
            }
        }

        const footprint = gingerbread.conversion_finish();

        if (method == "clipboard") {
            navigator.clipboard.writeText(footprint);
        } else {
            let file = new File([footprint], "design.kicad_pcb");
            yak.initiateDownload(file);
        }
    }
}

export class Layer {
    constructor(design, svg, options) {
        this.design = design;
        this.svg = svg;

        this.name = options.name;
        this.number = options.number;
        this.type = options.type || "raster";
        this.force_color = options.force_color || false;
        this.is_mask = options.is_mask || false;
        this.color = options.color || "red";

        this.visible = true;
    }

    get color() {
        return this._color;
    }

    set color(val) {
        this._color = val;

        if (this.force_color) {
            yak.SVGElement_color(this.svg, this._color, this._color);
        } else {
            yak.SVGElement_recolor(this.svg, this._color, this._color);
        }

        if (this.bitmap) {
            this.bitmap.close();
            this.bitmap = null;
        }
    }

    async get_preview_bitmap() {
        if (!this.bitmap) {
            this.bitmap = await yak.createImageBitmap(
                this.svg,
                this.design.preview_width
            );
            if (this.is_mask) {
                this.bitmap = await yak.ImageBitmap_inverse_mask(
                    this.bitmap,
                    await this.design.edge_cuts.get_preview_bitmap(),
                    this.color
                );
            }
        }
        return this.bitmap;
    }

    async get_raster_bitmap() {
        return await yak.createImageBitmap(
            this.svg,
            this.design.raster_width
        );
    }

    *get_paths() {
        yield* yak.SVGElement_to_paths(this.svg.documentElement);
    }

    get_circles() {
        return this.svg.documentElement.querySelectorAll("circle");
    }
}
