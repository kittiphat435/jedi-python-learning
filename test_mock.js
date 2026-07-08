// Mocking document
const values = {
  number1: "30",
  number2: "20",
  number3: "50"
};
const textContents = {
  C: "จ่ายตามจริง",
  E: "โปรส่วนลด"
};

global.document = {
  querySelector: (selector) => {
    const match = selector.match(/data-var="(.*?)"/);
    if(match) {
      const v = match[1];
      if (values[v] !== undefined) {
        return { get value() { return values[v]; }, set value(val) { values[v] = val; } };
      }
      if (textContents[v] !== undefined) {
        return { get textContent() { return textContents[v]; }, set textContent(val) { textContents[v] = val; } };
      }
    }
    return { value: "", textContent: "" };
  }
};

let A1, A2, A3, A5;

function cal() {
  try {
      A1=parseInt(document.querySelector('[data-var="number1"]').value)
      A2=parseInt(document.querySelector('[data-var="number2"]').value)
      A3=parseInt(document.querySelector('[data-var="number3"]').value)
      document.querySelector('[data-var="C"]').textContent = `ค่าใช้จ่ายเต็ม ${(A1*A2*A3)} บาท`
      return (A1*A2*A3)
  } catch (error) {
      console.error(error);
  }
}

function cal2() {
  try {
      A5=cal()
      console.log("A5 is:", A5);
      if(A5 > 5000)
          document.querySelector('[data-var="E"]').textContent = `ลด %10 =${ A5*10/100 } บาท`
      else if(A5 > 3000)
          document.querySelector('[data-var="E"]').textContent = `ลด %5 =${ A5*5/100 } บาท`
      else
          document.querySelector('[data-var="E"]').textContent = `ไม่มีส่วนลด`
  } catch (error) {
      console.error(error);
  }
}

cal();
console.log("After cal, C text:", textContents.C);

cal2();
console.log("After cal2, E text:", textContents.E);
