---
title: "Abstract Syntax Trees in GatorGrader"
---

I've been working on
[GatorGrader](https://github.com/GatorEducator/gatorgrader) for a while now,
and just recently participated in a development sprint.  There are many new
additions coming upstream soon, and one of the major ones is a transition to
using Abstract Syntax Tree (AST) parsing for Markdown checks. I headed up a
development team implementing the two main changes: refactoring existing
paragraph checks, and creating a new check for Markdown tags in a document.

### Markdown AST Parsing

The AST for Markdown is actually suprisingly simple; it has the basic structure
of an HTML-like markup tree, where there are open and close nodes, inside which
are more nodes containing content or sub-ASTs. The basic interaction is a
straightforward iteration, going through all of the nodes in a depth-first
manner. In the AST library we used
([commonmark-py](https://commonmark-py.readthedocs.io/en/latest/)), nodes are
interated, or 'walked' over with a simple construct, as seen below.

```python
import commonmark
ast = commonmark.Parser().parse("## Header\n***Some*** Paragraph")
for subnode, enter in ast.walker():
    print(subnode, "enter:", enter)
```

In this code snippet, `subnode` is an object that represents the node and its
contents that we are currently on, and `enter` tells us whether this node is an
open or close node. For instance, the output of the above code is as follows.

```bash
Node document [None] enter: True
Node heading [None] enter: True
Node text [Header] enter: True
Node heading [None] enter: False
Node paragraph [None] enter: True
Node emph [None] enter: True
Node strong [None] enter: True
Node text [Some] enter: True
Node strong [None] enter: False
Node emph [None] enter: False
Node text [ Paragraph] enter: True
Node paragraph [None] enter: False
Node document [None] enter: False
```

In this output you can see that we have the surrounding open and close
`document` tags, and the different `heading`, `paragraph`, `emph`, and `strong`
tags are visible as well. Finally, `text` tags contain actual text, the content
for this Markdown string. We use this kind of parsing to understand the
contents of a given Markdown file in GatorGrader, and count entities like tags
or certain kinds of paragraphs.

