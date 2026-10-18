---
name: prose-gates
description: Make a markdown file pass the prose gates, with the gate's finding messages as the only guide to each edit.
---

# Prose gates

The task names a gate command and a markdown file.

1. Run the command.
   It prints one finding per line, as `file:line rule message`, and exits 1 while any remain.
2. Edit the file in place to do what each message says.
3. Run the command again, and repeat until it exits 0.

Keep what the document says: change its form, never drop its content.
Edit only that file, and add no config.
