#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
converter.py

Конвертер Markdown-конспекта в структуру текущего data.js приложения «Конспекты».

ВАЖНО:
В текущей архитектуре одна логическая лекция хранится в двух массивах предмета:

    subject.lectures[]  -> метаданные лекции
    subject.cards[]     -> содержимое лекции, разбитое на секции

Поэтому output.txt содержит:
1. объект для массива `lectures`;
2. объекты для массива `cards`.

Скрипт НЕ меняет data.js автоматически.

Пример запуска:

    python converter.py lecture.md --num 3

или:

    python converter.py lecture.md --num 3 --id matan-limits

Результат:

    output.txt

Можно также использовать front matter:

---
num: 3
id: matan-limits
subtitle: Пределы последовательностей
tags: [матан, экзамен]
---

# Предел последовательности

## Определение

...
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

TRANSLIT = str.maketrans({
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
})


# LaTeX-окружения, которые считаются отдельной display-формулой.
BLOCK_ENVIRONMENTS = (
    "matrix",
    "pmatrix",
    "bmatrix",
    "Bmatrix",
    "vmatrix",
    "Vmatrix",
    "cases",
    "aligned",
    "align",
    "align*",
    "gather",
    "gather*",
    "split",
)


# ============================================================
# CLI
# ============================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert Markdown lecture to data.js-compatible "
            "lecture/cards JavaScript snippets."
        )
    )

    parser.add_argument(
        "input",
        type=Path,
        help="Путь к исходному .md файлу",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output.txt"),
        help="Файл результата. По умолчанию: output.txt",
    )

    parser.add_argument(
        "--num",
        type=int,
        default=None,
        help="Номер лекции, например --num 4",
    )

    parser.add_argument(
        "--id",
        dest="lecture_id",
        default=None,
        help="ID лекции. Если не задан — создаётся из H1",
    )

    parser.add_argument(
        "--subtitle",
        default=None,
        help="Subtitle лекции",
    )

    parser.add_argument(
        "--tags",
        default=None,
        help='Теги через запятую: --tags "матан, пределы, экзамен"',
    )

    return parser.parse_args()


# ============================================================
# SOURCE READING
# ============================================================

def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Файл не найден: {path}")

    if path.suffix.lower() != ".md":
        raise SystemExit("Исходный файл должен иметь расширение .md")

    # utf-8-sig также безопасно убирает BOM, если он присутствует.
    text = path.read_text(encoding="utf-8-sig")

    return (
        text
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )


# ============================================================
# FRONT MATTER
# ============================================================

def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    """
    Простой dependency-free parser для front matter.

    Поддерживает:

    ---
    num: 3
    id: matan-limits
    subtitle: ...
    tags: [матан, экзамен]
    ---
    """

    if not text.startswith("---\n"):
        return {}, text

    end = text.find("\n---\n", 4)

    if end == -1:
        return {}, text

    raw_meta = text[4:end]
    body = text[end + 5:]

    meta: dict[str, str] = {}

    for line in raw_meta.splitlines():
        line = line.strip()

        if not line:
            continue

        if line.startswith("#"):
            continue

        if ":" not in line:
            continue

        key, value = line.split(":", 1)

        key = key.strip().lower()
        value = value.strip()

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in ("'", '"')
        ):
            value = value[1:-1]

        meta[key] = value

    return meta, body


def split_tags(value: str | None) -> list[str]:
    if not value:
        return []

    value = value.strip()

    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]

    result: list[str] = []

    for item in value.split(","):
        item = item.strip().strip('"').strip("'")

        if item:
            result.append(item)

    return result


# ============================================================
# IDS
# ============================================================

def slugify(value: str) -> str:
    """
    Генерирует стабильный ASCII ID.

    "Предел последовательности"
        ->
    "predel-posledovatelnosti"
    """

    value = value.strip().lower()
    value = value.translate(TRANSLIT)

    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        ch
        for ch in value
        if not unicodedata.combining(ch)
    )

    value = re.sub(
        r"[^a-z0-9]+",
        "-",
        value,
    )

    value = re.sub(
        r"-+",
        "-",
        value,
    )

    value = value.strip("-")

    return value or "lecture"


# ============================================================
# H1
# ============================================================

def find_h1(text: str) -> tuple[str, str]:
    """
    Берёт первый H1 вне fenced code block.

    # Название лекции
    """

    lines = text.splitlines()

    in_fence = False
    fence_marker: str | None = None

    for index, line in enumerate(lines):
        stripped = line.lstrip()

        if stripped.startswith("```"):
            marker = "```"

            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif fence_marker == marker:
                in_fence = False
                fence_marker = None

            continue

        if stripped.startswith("~~~"):
            marker = "~~~"

            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif fence_marker == marker:
                in_fence = False
                fence_marker = None

            continue

        if in_fence:
            continue

        match = re.match(
            r"^\s*#\s+(.+?)\s*#*\s*$",
            line,
        )

        if match:
            title = match.group(1).strip()

            remaining = (
                lines[:index]
                + lines[index + 1:]
            )

            return (
                title,
                "\n".join(remaining).strip(),
            )

    raise SystemExit(
        "В Markdown отсутствует H1.\n"
        "Добавь заголовок, например:\n\n"
        "# Предел последовательности"
    )


# ============================================================
# LECTURE NUMBER
# ============================================================

def infer_lecture_num(
    title: str,
    meta: dict[str, str],
    cli_num: int | None,
) -> int:

    if cli_num is not None:
        if cli_num < 1:
            raise SystemExit("--num должен быть >= 1")

        return cli_num

    meta_num = meta.get("num", "")

    if meta_num.isdigit():
        num = int(meta_num)

        if num >= 1:
            return num

    # Позволяет писать:
    # # Лекция 3. Пределы
    # # Lecture 3. Limits

    match = re.search(
        r"\b(?:лекция|lecture)\s*#?\s*(\d+)\b",
        title,
        flags=re.I,
    )

    if match:
        return int(match.group(1))

    raise SystemExit(
        "Не удалось определить номер лекции.\n\n"
        "Используй один из вариантов:\n"
        "  python converter.py lecture.md --num 3\n\n"
        "или front matter:\n"
        "  ---\n"
        "  num: 3\n"
        "  ---\n\n"
        "или H1 вида:\n"
        "  # Лекция 3. Пределы"
    )


# ============================================================
# H2 -> CARDS
# ============================================================

def split_h2_sections(
    text: str,
    lecture_title: str,
) -> list[tuple[str, str]]:
    """
    Каждый H2 превращается в отдельную card текущего data.js.

    ## Определение
    ...
    ## Пример
    ...

    H3/H4 остаются внутри body карточки.
    """

    lines = text.splitlines()

    sections: list[tuple[str, list[str]]] = []

    current_title: str | None = None
    current_lines: list[str] = []

    preamble: list[str] = []

    in_fence = False
    fence_marker: str | None = None

    for line in lines:
        stripped = line.lstrip()

        if stripped.startswith("```"):
            marker = "```"

            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif fence_marker == marker:
                in_fence = False
                fence_marker = None

        elif stripped.startswith("~~~"):
            marker = "~~~"

            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif fence_marker == marker:
                in_fence = False
                fence_marker = None

        if not in_fence:
            match = re.match(
                r"^\s*##\s+(.+?)\s*#*\s*$",
                line,
            )

            if match:
                if current_title is not None:
                    sections.append(
                        (
                            current_title,
                            current_lines,
                        )
                    )

                elif any(
                    item.strip()
                    for item in current_lines
                ):
                    preamble.extend(current_lines)

                current_title = match.group(1).strip()
                current_lines = []

                continue

        current_lines.append(line)

    if current_title is not None:
        sections.append(
            (
                current_title,
                current_lines,
            )
        )

    elif any(
        item.strip()
        for item in current_lines
    ):
        preamble.extend(current_lines)

    result: list[tuple[str, str]] = []

    # Если между H1 и первым H2 есть нормальный текст,
    # не придумываем слово "Введение".
    # Используем исходный H1 как имя первой карточки.
    if any(
        item.strip()
        for item in preamble
    ):
        result.append(
            (
                lecture_title,
                "\n".join(preamble).strip(),
            )
        )

    for section_title, body_lines in sections:
        result.append(
            (
                section_title,
                "\n".join(body_lines).strip(),
            )
        )

    if not result:
        result.append(
            (
                lecture_title,
                "",
            )
        )

    return result


# ============================================================
# MARKDOWN TABLES
# ============================================================

def split_table_row(line: str) -> list[str]:
    """
    Разделяет:

    | A | B | C |

    При этом старается не ломать escaped pipe: \\|
    """

    value = line.strip()

    if not value:
        return []

    if value.startswith("|"):
        value = value[1:]

    if value.endswith("|") and not value.endswith("\\|"):
        value = value[:-1]

    cells: list[str] = []
    buffer: list[str] = []

    escaped = False

    for char in value:
        if escaped:
            buffer.append(char)
            escaped = False
            continue

        if char == "\\":
            escaped = True
            buffer.append(char)
            continue

        if char == "|":
            cells.append(
                "".join(buffer).strip()
            )
            buffer = []
            continue

        buffer.append(char)

    cells.append(
        "".join(buffer).strip()
    )

    return cells


def is_table_separator(line: str) -> bool:
    cells = split_table_row(line)

    if not cells:
        return False

    return all(
        re.fullmatch(
            r":?-{3,}:?",
            cell.strip(),
        )
        is not None
        for cell in cells
    )


# ============================================================
# INLINE MARKDOWN + INLINE LATEX
# ============================================================

def protect_inline(
    text: str,
) -> tuple[str, list[str]]:
    """
    Защищает inline-code и LaTeX перед HTML escaping.

    Поддерживает:

        `code`

        \\( x^2 \\)

        $x^2$

    Формулы превращаются в:

        <span class="formula">...</span>

    Это соответствует текущему MathRenderer приложения.
    """

    vault: list[str] = []

    def create_token(fragment: str) -> str:
        index = len(vault)
        vault.append(fragment)

        return f"@@KONSP_TOKEN_{index}@@"

    # --------------------------------------------------------
    # Inline code
    # --------------------------------------------------------

    text = re.sub(
        r"`([^`\n]+)`",
        lambda match: create_token(
            "<code>"
            + html.escape(
                match.group(1),
                quote=False,
            )
            + "</code>"
        ),
        text,
    )

    # --------------------------------------------------------
    # \( ... \)
    # --------------------------------------------------------

    text = re.sub(
        r"\\\(([\s\S]*?)\\\)",
        lambda match: create_token(
            '<span class="formula">'
            + html.escape(
                match.group(1).strip(),
                quote=False,
            )
            + "</span>"
        ),
        text,
    )

    # --------------------------------------------------------
    # $ ... $
    # --------------------------------------------------------

    text = re.sub(
        r"(?<!\\)\$(?!\$)([^\n$]+?)(?<!\\)\$",
        lambda match: create_token(
            '<span class="formula">'
            + html.escape(
                match.group(1).strip(),
                quote=False,
            )
            + "</span>"
        ),
        text,
    )

    return text, vault


def restore_inline(
    text: str,
    vault: list[str],
) -> str:

    for index, fragment in enumerate(vault):
        text = text.replace(
            f"@@KONSP_TOKEN_{index}@@",
            fragment,
        )

    return text


def inline_md(text: str) -> str:
    protected, vault = protect_inline(text)

    # Любой сырой HTML из Markdown экранируем.
    # Так source-конспект не сможет случайно сломать DOM.
    value = html.escape(
        protected,
        quote=False,
    )

    # --------------------------------------------------------
    # Markdown images
    #
    # В текущем sanitizer приложения IMG не разрешён.
    # Поэтому сохраняем информацию текстом.
    # --------------------------------------------------------

    value = re.sub(
        r"!\[([^\]]*)\]\(([^)]+)\)",
        r"\1 (\2)",
        value,
    )

    # --------------------------------------------------------
    # Markdown links
    #
    # <a> также не входит в текущий sanitizer лекций.
    # Не теряем URL, а оставляем его текстом.
    # --------------------------------------------------------

    value = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r"\1 (\2)",
        value,
    )

    # --------------------------------------------------------
    # Bold
    # --------------------------------------------------------

    value = re.sub(
        r"\*\*(.+?)\*\*",
        r"<strong>\1</strong>",
        value,
    )

    value = re.sub(
        r"__(.+?)__",
        r"<strong>\1</strong>",
        value,
    )

    # --------------------------------------------------------
    # Italic
    # --------------------------------------------------------

    value = re.sub(
        r"(?<!\*)\*([^*\n]+?)\*(?!\*)",
        r"<em>\1</em>",
        value,
    )

    value = re.sub(
        r"(?<!\w)_([^_\n]+?)_(?!\w)",
        r"<em>\1</em>",
        value,
    )

    return restore_inline(
        value,
        vault,
    )


# ============================================================
# DISPLAY LATEX
# ============================================================

def collect_display_math(
    lines: list[str],
    start: int,
) -> tuple[str, int] | None:
    """
    Распознаёт:

        $$ ... $$

        \\[
        ...
        \\]

        \\begin{pmatrix}
        ...
        \\end{pmatrix}

    Возвращает:
        (latex_source, next_line_index)
    """

    stripped = lines[start].strip()

    # --------------------------------------------------------
    # $$ ... $$
    # --------------------------------------------------------

    if stripped.startswith("$$"):
        first = stripped[2:]

        # Однострочный вариант:
        # $$ x^2 $$
        if (
            first.endswith("$$")
            and len(first) >= 2
        ):
            return (
                first[:-2].strip(),
                start + 1,
            )

        buffer: list[str] = []

        if first:
            buffer.append(first)

        index = start + 1

        while index < len(lines):
            line = lines[index]

            if line.strip().endswith("$$"):
                position = line.rfind("$$")
                before = line[:position]

                if before:
                    buffer.append(before)

                return (
                    "\n".join(buffer).strip(),
                    index + 1,
                )

            buffer.append(line)
            index += 1

        raise SystemExit(
            f"Незакрытый $$ LaTeX-блок около строки "
            f"{start + 1}"
        )

    # --------------------------------------------------------
    # \[ ... \]
    # --------------------------------------------------------

    if stripped.startswith("\\["):
        first = stripped[2:]

        if first.endswith("\\]"):
            return (
                first[:-2].strip(),
                start + 1,
            )

        buffer: list[str] = []

        if first:
            buffer.append(first)

        index = start + 1

        while index < len(lines):
            line = lines[index]

            position = line.rfind("\\]")

            if position != -1:
                before = line[:position]

                if before:
                    buffer.append(before)

                return (
                    "\n".join(buffer).strip(),
                    index + 1,
                )

            buffer.append(line)
            index += 1

        raise SystemExit(
            f"Незакрытый \\\\[ LaTeX-блок около строки "
            f"{start + 1}"
        )

    # --------------------------------------------------------
    # \begin{pmatrix} ...
    # --------------------------------------------------------

    env_match = re.match(
        r"\\begin\{([^}]+)\}",
        stripped,
    )

    if env_match:
        environment = env_match.group(1)

        if environment not in BLOCK_ENVIRONMENTS:
            return None

        end_marker = (
            f"\\end{{{environment}}}"
        )

        buffer = [
            lines[start]
        ]

        if end_marker in lines[start]:
            return (
                "\n".join(buffer).strip(),
                start + 1,
            )

        index = start + 1

        while index < len(lines):
            buffer.append(
                lines[index]
            )

            if end_marker in lines[index]:
                return (
                    "\n".join(buffer).strip(),
                    index + 1,
                )

            index += 1

        raise SystemExit(
            "Незакрыто LaTeX-окружение "
            f"{environment!r} около строки "
            f"{start + 1}"
        )

    return None


# ============================================================
# CALLOUTS
# ============================================================

def render_callout(
    block_lines: list[str],
) -> str:
    """
    Поддерживает GitHub-style callouts:

        > [!IMPORTANT]
        > Это важно.

        > [!TIP]
        > Главное.

        > [!EXAMPLE]
        > Пример.

        > [!REMEMBER]
        > Запомни.

    Они превращаются в уже существующие классы приложения.
    """

    lines = [
        re.sub(
            r"^\s*>\s?",
            "",
            line,
        )
        for line in block_lines
    ]

    if not lines:
        return ""

    marker = re.match(
        r"^\[!"
        r"(NOTE|TIP|IMPORTANT|WARNING|EXAMPLE|REMEMBER)"
        r"\]\s*(.*)$",
        lines[0],
        flags=re.I,
    )

    # Обычный blockquote.
    if not marker:
        body = " ".join(
            line.strip()
            for line in lines
            if line.strip()
        )

        return (
            "<blockquote>"
            + inline_md(body)
            + "</blockquote>"
        )

    kind = marker.group(1).upper()
    first_body_line = marker.group(2).strip()

    callout_config = {
        "NOTE": (
            "note",
            "Заметка",
        ),
        "TIP": (
            "tip",
            "Главное",
        ),
        "IMPORTANT": (
            "warning",
            "Важно",
        ),
        "WARNING": (
            "warning",
            "Важно",
        ),
        "EXAMPLE": (
            "example",
            "Пример",
        ),
        "REMEMBER": (
            "tip",
            "Запомни",
        ),
    }

    css_class, default_title = (
        callout_config[kind]
    )

    body_lines: list[str] = []

    if first_body_line:
        body_lines.append(
            first_body_line
        )

    body_lines.extend(
        lines[1:]
    )

    body_source = (
        "\n".join(body_lines).strip()
    )

    body_html = (
        markdown_to_html(body_source)
        if body_source
        else ""
    )

    return (
        f'<div class="callout {css_class}">'
        '<div class="callout-title">'
        '<span class="callout-icon">•</span>'
        f"<span>{inline_md(default_title)}</span>"
        "</div>"
        '<div class="callout-body">'
        f"{body_html}"
        "</div>"
        "</div>"
    )


# ============================================================
# MARKDOWN -> SANITIZER-COMPATIBLE HTML
# ============================================================

def markdown_to_html(
    markdown: str,
) -> str:
    """
    Dependency-free Markdown -> HTML converter.

    Генерирует только те HTML-элементы, которые поддерживает
    текущий sanitizer приложения:

        p
        h3
        h4
        ul
        ol
        li
        table
        thead
        tbody
        tr
        th
        td
        div
        span
        strong
        em
        code
        br
        blockquote
        sub
        sup

    Формулы:

        $x^2$
            ->
        <span class="formula">x^2</span>

        $$ ... $$
            ->
        <div class="math-display">...</div>
    """

    lines = markdown.splitlines()

    output: list[str] = []

    index = 0

    def is_block_start(
        line_index: int,
    ) -> bool:

        if line_index >= len(lines):
            return True

        line = lines[line_index]
        stripped = line.strip()

        if not stripped:
            return True

        if stripped.startswith(
            (
                "```",
                "~~~",
                "$$",
                "\\[",
                ">",
            )
        ):
            return True

        if re.match(
            r"^\s*#{3,6}\s+",
            line,
        ):
            return True

        if re.match(
            r"^\s*[-*+]\s+",
            line,
        ):
            return True

        if re.match(
            r"^\s*\d+[.)]\s+",
            line,
        ):
            return True

        if re.match(
            r"\\begin\{([^}]+)\}",
            stripped,
        ):
            return True

        if (
            line_index + 1 < len(lines)
            and "|" in line
            and is_table_separator(
                lines[line_index + 1]
            )
        ):
            return True

        return False

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        # ----------------------------------------------------
        # Empty
        # ----------------------------------------------------

        if not stripped:
            index += 1
            continue

        # ----------------------------------------------------
        # Display LaTeX
        # ----------------------------------------------------

        math_block = collect_display_math(
            lines,
            index,
        )

        if math_block:
            latex_source, index = math_block

            # html.escape нужен только для DOM.
            # textContent в MathRenderer восстановит:
            #
            #   &amp; -> &
            #   &lt;  -> <
            #
            # А сам исходный LaTeX не изменяется.

            output.append(
                '<div class="math-display">'
                + html.escape(
                    latex_source,
                    quote=False,
                )
                + "</div>"
            )

            continue

        # ----------------------------------------------------
        # Fenced code
        # ----------------------------------------------------

        if (
            stripped.startswith("```")
            or stripped.startswith("~~~")
        ):
            fence = (
                "```"
                if stripped.startswith("```")
                else "~~~"
            )

            code_lines: list[str] = []

            index += 1

            while index < len(lines):
                if lines[index].strip().startswith(
                    fence
                ):
                    break

                code_lines.append(
                    lines[index]
                )

                index += 1

            if index >= len(lines):
                raise SystemExit(
                    "Незакрытый fenced code block"
                )

            index += 1

            # <pre> не входит в sanitizer текущего приложения,
            # поэтому сохраняем переносы через <br>.

            code_html = "<br>".join(
                html.escape(
                    item,
                    quote=False,
                )
                for item in code_lines
            )

            if not code_html:
                code_html = "&nbsp;"

            output.append(
                "<p><code>"
                + code_html
                + "</code></p>"
            )

            continue

        # ----------------------------------------------------
        # Markdown table
        # ----------------------------------------------------

        if (
            index + 1 < len(lines)
            and "|" in line
            and is_table_separator(
                lines[index + 1]
            )
        ):
            headers = split_table_row(
                line
            )

            index += 2

            rows: list[list[str]] = []

            while (
                index < len(lines)
                and lines[index].strip()
                and "|" in lines[index]
            ):
                rows.append(
                    split_table_row(
                        lines[index]
                    )
                )

                index += 1

            width = max(
                [len(headers)]
                + [
                    len(row)
                    for row in rows
                ]
            )

            headers = (
                headers
                + [""] * (
                    width - len(headers)
                )
            )

            normalized_rows = []

            for row in rows:
                normalized_rows.append(
                    row
                    + [""] * (
                        width - len(row)
                    )
                )

            output.append(
                "<table>"
                "<thead>"
                "<tr>"
                + "".join(
                    "<th>"
                    + inline_md(cell)
                    + "</th>"
                    for cell in headers
                )
                + "</tr>"
                "</thead>"
                "<tbody>"
            )

            for row in normalized_rows:
                output.append(
                    "<tr>"
                    + "".join(
                        "<td>"
                        + inline_md(cell)
                        + "</td>"
                        for cell in row
                    )
                    + "</tr>"
                )

            output.append(
                "</tbody>"
                "</table>"
            )

            continue

        # ----------------------------------------------------
        # H3-H6
        #
        # sanitizer поддерживает H3/H4.
        # H5/H6 понижаем до H4.
        # ----------------------------------------------------

        heading_match = re.match(
            r"^\s*(#{3,6})\s+"
            r"(.+?)\s*#*\s*$",
            line,
        )

        if heading_match:
            source_level = len(
                heading_match.group(1)
            )

            html_level = (
                3
                if source_level == 3
                else 4
            )

            heading_text = (
                heading_match
                .group(2)
                .strip()
            )

            output.append(
                f"<h{html_level}>"
                + inline_md(
                    heading_text
                )
                + f"</h{html_level}>"
            )

            index += 1
            continue

        # ----------------------------------------------------
        # Blockquotes / callouts
        # ----------------------------------------------------

        if re.match(
            r"^\s*>",
            line,
        ):
            quote_lines: list[str] = []

            while index < len(lines):
                current = lines[index]

                if re.match(
                    r"^\s*>",
                    current,
                ):
                    quote_lines.append(
                        current
                    )
                    index += 1
                    continue

                # Пустая строка внутри quote block.
                if not current.strip():
                    quote_lines.append(
                        current
                    )
                    index += 1
                    continue

                break

            output.append(
                render_callout(
                    quote_lines
                )
            )

            continue

        # ----------------------------------------------------
        # UL
        # ----------------------------------------------------

        if re.match(
            r"^\s*[-*+]\s+",
            line,
        ):
            items: list[str] = []

            while index < len(lines):
                match = re.match(
                    r"^\s*[-*+]\s+(.+)$",
                    lines[index],
                )

                if not match:
                    break

                items.append(
                    match.group(1)
                )

                index += 1

            output.append(
                "<ul>"
                + "".join(
                    "<li>"
                    + inline_md(item)
                    + "</li>"
                    for item in items
                )
                + "</ul>"
            )

            continue

        # ----------------------------------------------------
        # OL
        # ----------------------------------------------------

        if re.match(
            r"^\s*\d+[.)]\s+",
            line,
        ):
            items: list[str] = []

            while index < len(lines):
                match = re.match(
                    r"^\s*\d+[.)]\s+(.+)$",
                    lines[index],
                )

                if not match:
                    break

                items.append(
                    match.group(1)
                )

                index += 1

            output.append(
                "<ol>"
                + "".join(
                    "<li>"
                    + inline_md(item)
                    + "</li>"
                    for item in items
                )
                + "</ol>"
            )

            continue

        # ----------------------------------------------------
        # Paragraph
        # ----------------------------------------------------

        paragraph_lines: list[str] = []

        while (
            index < len(lines)
            and lines[index].strip()
        ):
            if (
                paragraph_lines
                and is_block_start(index)
            ):
                break

            paragraph_lines.append(
                lines[index]
            )

            index += 1

        paragraph_parts: list[str] = []

        for raw_line in paragraph_lines:
            # Markdown hard line break:
            #
            # text__
            # next
            #
            # где __ = два пробела.

            if raw_line.endswith("  "):
                paragraph_parts.append(
                    inline_md(
                        raw_line[:-2].strip()
                    )
                    + "<br>"
                )
            else:
                paragraph_parts.append(
                    inline_md(
                        raw_line.strip()
                    )
                )

        output.append(
            "<p>"
            + " ".join(
                part
                for part in paragraph_parts
                if part
            )
            + "</p>"
        )

    return "\n".join(
        block
        for block in output
        if block
    )


# ============================================================
# SUMMARIES
# ============================================================

def plain_text_from_html(
    value: str,
) -> str:
    value = re.sub(
        r"<br\s*/?>",
        " ",
        value,
        flags=re.I,
    )

    value = re.sub(
        r"<[^>]+>",
        " ",
        value,
    )

    value = html.unescape(
        value
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value.strip()


def truncate_text(
    value: str,
    limit: int,
) -> str:
    value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip()

    if len(value) <= limit:
        return value

    cut = value[:limit + 1]

    last_space = cut.rfind(" ")

    if last_space >= int(
        limit * 0.65
    ):
        cut = cut[:last_space]
    else:
        cut = cut[:limit]

    cut = cut.rstrip(
        " ,.;:-"
    )

    return cut + "…"


# ============================================================
# SAFE JAVASCRIPT SERIALIZATION
# ============================================================

def js_json(
    obj: object,
    indent: int = 2,
) -> str:
    """
    КЛЮЧЕВОЙ МОМЕНТ.

    Никогда не собираем JS-строки вручную.

    json.dumps автоматически делает:

        \frac
            ->
        \\frac

        "text"
            ->
        \"text\"

    реальные переносы внутри strings
            ->
        \\n

    tabs
            ->
        \\t

    backslashes
            ->
        \\

    JSON-объект одновременно является валидным
    JavaScript object literal.
    """

    result = json.dumps(
        obj,
        ensure_ascii=False,
        indent=indent,
    )

    # U+2028/U+2029 исторически могли быть проблемой
    # в старых JS engines / WebView.

    result = result.replace(
        "\u2028",
        "\\u2028",
    )

    result = result.replace(
        "\u2029",
        "\\u2029",
    )

    # На случай, если когда-либо output будет вставлен
    # прямо внутрь HTML <script>.
    result = result.replace(
        "</script",
        "<\\/script",
    )

    return result


# ============================================================
# BUILD DATA.JS OBJECTS
# ============================================================

def build_objects(
    source: str,
    args: argparse.Namespace,
) -> tuple[dict, list[dict]]:

    meta, markdown = (
        parse_front_matter(
            source
        )
    )

    title, markdown = find_h1(
        markdown
    )

    lecture_num = infer_lecture_num(
        title=title,
        meta=meta,
        cli_num=args.num,
    )

    raw_id = (
        args.lecture_id
        or meta.get("id")
        or title
    )

    lecture_id = slugify(
        raw_id
    )

    subtitle = (
        args.subtitle
        if args.subtitle is not None
        else meta.get(
            "subtitle",
            "",
        )
    )

    tags_source = (
        args.tags
        if args.tags is not None
        else meta.get("tags")
    )

    tags = split_tags(
        tags_source
    )

    sections = split_h2_sections(
        markdown,
        lecture_title=title,
    )

    cards: list[dict] = []
    topics: list[str] = []

    for card_index, (
        section_title,
        section_markdown,
    ) in enumerate(
        sections,
        start=1,
    ):
        body_html = markdown_to_html(
            section_markdown
        )

        card_summary = truncate_text(
            plain_text_from_html(
                body_html
            ),
            220,
        )

        topics.append(
            section_title
        )

        card = {
            "lecture": lecture_num,
            "lectureTitle": title,
            "title": section_title,
            "tags": [],
            "summary": card_summary,
            "body": body_html,
            "id": (
                f"{lecture_id}-t"
                f"{card_index}"
            ),
        }

        cards.append(
            card
        )

    lecture_summary = next(
        (
            card["summary"]
            for card in cards
            if card["summary"]
        ),
        "",
    )

    # Точная структура lecture object,
    # которую сейчас использует data.js.

    lecture = {
        "id": lecture_id,
        "num": lecture_num,
        "title": title,
        "subtitle": subtitle,
        "tags": tags,
        "summary": lecture_summary,
        "topics": topics,
    }

    return lecture, cards


# ============================================================
# VALIDATION
# ============================================================

def validate_serialization(
    lecture: dict,
    cards: list[dict],
) -> None:
    """
    Round-trip validation.

    Если Python смог:
        object -> JSON -> object

    без изменения данных, значит кавычки,
    control chars, переносы и LaTeX backslashes
    сериализованы корректно.
    """

    objects = [
        lecture,
        *cards,
    ]

    for obj in objects:
        encoded = json.dumps(
            obj,
            ensure_ascii=False,
        )

        decoded = json.loads(
            encoded
        )

        if decoded != obj:
            raise RuntimeError(
                "JSON serialization "
                "round-trip failed."
            )


# ============================================================
# OUTPUT
# ============================================================

def make_output(
    lecture: dict,
    cards: list[dict],
) -> str:
    """
    output.txt специально разделён на два блока,
    потому что текущий data.js хранит metadata/content
    отдельно.
    """

    lecture_block = js_json(
        lecture
    )

    cards_block = ",\n".join(
        js_json(card)
        for card in cards
    )

    cards_trailing_comma = (
        ","
        if cards
        else ""
    )

    return (
        "// ================================================\n"
        "// GENERATED BY converter.py\n"
        "// ================================================\n"
        "//\n"
        "// Ничего внутри строк вручную экранировать НЕ нужно.\n"
        "// Все кавычки, переносы и LaTeX backslashes уже\n"
        "// безопасно сериализованы через JSON.\n"
        "//\n\n"

        "// ================================================\n"
        "// 1. ДОБАВИТЬ В subject.lectures[]\n"
        "// ================================================\n\n"

        f"{lecture_block},\n\n"

        "// ================================================\n"
        "// 2. ДОБАВИТЬ В subject.cards[] ТОГО ЖЕ ПРЕДМЕТА\n"
        "// ================================================\n\n"

        f"{cards_block}"
        f"{cards_trailing_comma}\n"
    )


# ============================================================
# MAIN
# ============================================================

def main() -> None:
    args = parse_args()

    source = read_text(
        args.input
    )

    lecture, cards = build_objects(
        source,
        args,
    )

    validate_serialization(
        lecture,
        cards,
    )

    output = make_output(
        lecture,
        cards,
    )

    args.output.write_text(
        output,
        encoding="utf-8",
        newline="\n",
    )

    print(
        f"OK: создан {args.output}"
    )

    print(
        "Лекция: "
        f"#{lecture['num']} "
        f"{lecture['title']}"
    )

    print(
        f"ID: {lecture['id']}"
    )

    print(
        f"Карточек: {len(cards)}"
    )


if __name__ == "__main__":
    try:
        main()

    except BrokenPipeError:
        sys.exit(1)