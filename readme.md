# Circlepack-canvas

circle packing based on cavas, inspired by:

[Zoomable Circle Packing with Canvas & D3.js - I](http://bl.ocks.org/nbremer/667e4df76848e72f250b) and [circlepack-chart](https://github.com/vasturiano/circlepack-chart)


# Dataset

```
{
  "name": "root name",
  "children": [
    {
      "name": "some random title",
      "children": [
        {
          "name": "hi this is the first child",
          "children": [
            {
              "name": "someone",
              "children": [
                {
                  "name": "still on alpha :D",
                  "ID": "1.1.2.1",
                  "size": 101,
                  "children": [
                    {
                     "name": "alpha.1"
                    },
                    {
                     "name": "wip"
                    },
                    {
                     "name": "hopefully beta soon"
                    }
                   ]
                },
                ...
              ...
            ...
          ...
        ...
      ...
    ...
  ...
}
```

# how to use

```html
<div id="chart"></div>
```

```js
import circlepackCanvas from 'circlepack-canvas'

circlepackCanvas('#chart', {
  dataset,
  // default values
  padding: 1,
  colorRange: ['#9677FF', '#CFC1FB', '#655E7A', '#765DC7', '#4A3A7A', '#A599C7', '#9475FA', '#FFFFFF'],
  value: node => node.size,
  sort: node => node.ID,
  initCirclesDuration: 2000,
})

```
