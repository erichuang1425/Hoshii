
# Natural Sort Test Fixtures

Use these as the definitive test cases for `services/natural_sort.rs` and `model/mediaGrouping.ts`. Every Claude instance working on sorting or grouping must validate against these. (Just to clarify the gallery images can be sorted in reverse order if the user decides to switch browsing order.)

## Sort Order Tests

Each test is: `input filenames → expected sorted order`

### Basic numeric

```
Input:  ["10.jpg", "1.jpg", "2.jpg", "20.jpg", "3.jpg"]
Expect: ["1.jpg", "2.jpg", "3.jpg", "10.jpg", "20.jpg"]
```

### Zero-padded

```
Input:  ["page_010.jpg", "page_001.jpg", "page_100.jpg", "page_002.jpg"]
Expect: ["page_001.jpg", "page_002.jpg", "page_010.jpg", "page_100.jpg"]
```

### Prefixed with number

```
Input:  ["lucy2.jpg", "eva1.jpg", "lucy1.jpg", "eva2.jpg", "lucy10.jpg"]
Expect: ["eva1.jpg", "eva2.jpg", "lucy1.jpg", "lucy2.jpg", "lucy10.jpg"]
```

### Mixed media types (sort together by number)

```
Input:  ["3.gif", "1.jpg", "2.mp4", "4.avif"]
Expect: ["1.jpg", "2.mp4", "3.gif", "4.avif"]
```

### Camera naming

```
Input:  ["IMG_20240301_003.jpg", "IMG_20240301_001.jpg", "IMG_20240301_002.jpg"]
Expect: ["IMG_20240301_001.jpg", "IMG_20240301_002.jpg", "IMG_20240301_003.jpg"]
```

### Mixed case (case-insensitive)

```
Input:  ["Lucy2.jpg", "lucy1.jpg", "LUCY3.png"]
Expect: ["lucy1.jpg", "Lucy2.jpg", "LUCY3.png"]
Group:  All three should be in group "lucy" (lowercased)
```

### Download duplicates with parenthetical numbers

```
Input:  ["image (2).jpg", "image (1).jpg", "image (10).jpg", "image.jpg"]
Expect: ["image.jpg", "image (1).jpg", "image (2).jpg", "image (10).jpg"]
```

### Unicode prefixes

```
Input:  ["日本語2.jpg", "日本語1.jpg", "日本語10.jpg"]
Expect: ["日本語1.jpg", "日本語2.jpg", "日本語10.jpg"]
Group:  "日本語"
```

### No numbers at all (alphabetical fallback)

```
Input:  ["cover.jpg", "back.jpg", "art.png"]
Expect: ["art.png", "back.jpg", "cover.jpg"]
Group:  Each is its own group (or single unnamed group)
```

### Files with suffix after number

```
Input:  ["pic3_final.jpg", "pic1_draft.jpg", "pic2_v2.jpg"]
Expect: ["pic1_draft.jpg", "pic2_v2.jpg", "pic3_final.jpg"]
Note:   Extract number from first numeric sequence: pic(1), pic(2), pic(3)
```

### Mixed: some grouped, some ungrouped

```
Input:  ["1.jpg", "2.jpg", "lucy1.jpg", "lucy2.jpg", "3.jpg"]
Expect: ["1.jpg", "2.jpg", "3.jpg", "lucy1.jpg", "lucy2.jpg"]
Groups: "" (items 1,2,3) and "lucy" (items lucy1,lucy2)
```

### Hyphenated prefix

```
Input:  ["char-b-1.png", "char-a-2.png", "char-a-1.png", "char-b-2.png"]
Expect: ["char-a-1.png", "char-a-2.png", "char-b-1.png", "char-b-2.png"]
Groups: "char-a-" and "char-b-"
```

### Single file (edge case)

```
Input:  ["cover.jpg"]
Expect: ["cover.jpg"]
Groups: No subheading nav shown (single group)
```

### Empty (edge case)

```
Input:  []
Expect: []
Groups: None
```

## Group Extraction Tests

|Filename              |Extracted Group      |Extracted Number|
|----------------------|---------------------|----------------|
|`1.jpg`               |`""` (empty)         |1               |
|`10.jpg`              |`""`                 |10              |
|`lucy1.jpg`           |`"lucy"`             |1               |
|`lucy_02.jpg`         |`"lucy_"`            |2               |
|`page_001.jpg`        |`"page_"`            |1               |
|`IMG_20240301_001.jpg`|`"IMG_20240301_"`    |1               |
|`image (3).jpg`       |`"image "`           |3               |
|`cover.jpg`           |`"cover"`            |0 (no number)   |
|`日本語5.png`            |`"日本語"`              |5               |
|`Lucy10.jpg`          |`"lucy"` (lowercased)|10              |
|`char-a-3.png`        |`"char-a-"`          |3               |
|`pic2_final.jpg`      |`"pic"`              |2               |

## Subheading Nav Display Rules

|Scenario                                  |Show Subheading Nav?|Display                                     |
|------------------------------------------|--------------------|--------------------------------------------|
|All files ungrouped (1.jpg, 2.jpg, 3.jpg) |No                  |—                                           |
|All files same group (lucy1, lucy2, lucy3)|No                  |—                                           |
|2+ distinct groups                        |Yes                 |`[All 24] [lucy ●12] [eva ●8] [mia ●4]`     |
|Mix of grouped + ungrouped                |Yes                 |`[All 10] [Ungrouped ●4] [lucy ●3] [eva ●3]`|Written with [StackEdit](https://stackedit.io/).
