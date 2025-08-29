function highlightPoints(points) {
    points.forEach((point) => {
      const regex = new RegExp(point, "gi");
      document.body.innerHTML = document.body.innerHTML.replace(
        regex,
        `<mark style="background: yellow; font-weight: bold;">$&</mark>`
      );
    });
  }
  