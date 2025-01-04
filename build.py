import pathlib
import jinja2
import shutil
import argparse

try:
    import livereload
except ImportError:
    livereload = None

parser = argparse.ArgumentParser()
parser.add_argument('-t', '--tests', action="store_true")
args = parser.parse_args()

HERE = pathlib.Path(__file__).parent
WEB = HERE / "web"
NATIVE = HERE / "native"
BUILD = HERE / "build"
RESOURCES = [
    "images",
    "scripts",
    "styles",
    "favicon.ico",
]
EXCLUDE_PAGES = [
    "test.html",
]

if(args.tests):
    RESOURCES.append("scripts/tests")
    EXCLUDE_PAGES = []

JINJA_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(WEB),
    cache_size=0,
)


def make_output_dirs():
    BUILD.mkdir(parents=True, exist_ok=True)


def copy_resources():
    for name in (RESOURCES):
        src = WEB / name
        dest = BUILD / src.relative_to(WEB)

        if src.is_dir():
            shutil.copytree(src, dest, dirs_exist_ok=True)
        else:
            shutil.copy(src, dest)

        print(f"Copied {dest.relative_to(BUILD)}")


def build_pages():
    pages = WEB.glob("*.html")
    for page in pages:
        dest = BUILD / page.relative_to(WEB)
        relpath = dest.relative_to(BUILD)
        if str(relpath) in EXCLUDE_PAGES:
            continue

        template = JINJA_ENV.get_template(str(page.relative_to(WEB)))
        rendered = template.render()
        dest.write_text(rendered)
        print(f"Rendered {relpath}")


def copy_native():
    src = NATIVE / "zig-out" / "bin" / "gingerbread.wasm"
    dest = BUILD / "native" / "gingerbread.wasm"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    print(f"Copied {dest.relative_to(BUILD)}")


def build():
    make_output_dirs()
    copy_resources()
    copy_native()
    build_pages()


def watch():
    server = livereload.Server()
    server.watch(WEB, func=build, delay="forever")
    server.watch(BUILD)
    server.watch(NATIVE, func=build)
    server.serve(root="build")


def main():
    build()

    if livereload:
        watch()


if __name__ == "__main__":
    main()
