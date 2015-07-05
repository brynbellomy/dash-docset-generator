---
title: Shell Fu
name: Shell Fu
bundle_name: ShellFu
keyword: shellfu
files: ['index.md', '../style.css']
stylesheet: style.css
---

# don't forget to use the `eg` command!

available here: <https://github.com/srsudar/eg>

# misc. commands

| Name                                                      | Command                                                                    | Notes   |
| ------                                                    | ---------                                                                  | ------- |
| `sed` in-place replacement                                | `sed -i '' "s/find/replace/g"`                                             |         |
| use `grep` to HIDE matching lines instead of showing them | `grep -v ...`                                                              |         |
| `wget`: download website                                  | `wget -r -np -k http://www.ime.usp.br/~coelho/mac0122-2013/ep2/esqueleto/` |         |
[General]


---

# wget

For downloading files from a directory listing, use -r (recursive), -np (don't follow links to parent directories), and -k to make links in downloaded HTML or CSS point to local files (credit @xaccrocheur).

```sh
$ wget -r -np -k http://www.ime.usp.br/~coelho/mac0122-2013/ep2/esqueleto/
```

Other useful options:

- `-nd` (no directories): download all files to the current directory
- `-e robots.off`: ignore robots.txt files, don't download robots.txt files
- `-A png,jpg`: accept only files with the extensions png or jpg
- `-m (mirror)`: -r --timestamping --level inf --no-remove-listing
