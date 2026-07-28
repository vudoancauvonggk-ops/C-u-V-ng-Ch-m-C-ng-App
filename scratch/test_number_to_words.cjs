function numberToVietnameseWords(number) {
  if (number === 0) return "Không đồng";
  if (!number || isNaN(number)) return "";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(num, showZeroHundred = false) {
    let hundred = Math.floor(num / 100);
    let ten = Math.floor((num % 100) / 10);
    let unit = num % 10;

    let res = "";

    if (hundred > 0 || showZeroHundred) {
      res += units[hundred] + " trăm ";
    }

    if (ten > 1) {
      res += units[ten] + " mươi ";
      if (unit === 1) res += "mốt ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += units[unit] + " ";
    } else if (ten === 1) {
      res += "mười ";
      if (unit === 1) res += "một ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += units[unit] + " ";
    } else {
      if ((hundred > 0 || showZeroHundred) && unit > 0) {
        res += "lẻ ";
      }
      if (unit > 0) {
        res += units[unit] + " ";
      }
    }

    return res;
  }

  let numStr = Math.round(Math.abs(number)).toString();
  let groups = [];
  
  while (numStr.length > 0) {
    if (numStr.length >= 3) {
      groups.unshift(parseInt(numStr.substring(numStr.length - 3)));
      numStr = numStr.substring(0, numStr.length - 3);
    } else {
      groups.unshift(parseInt(numStr));
      numStr = "";
    }
  }

  const groupUnits = ["", "ngàn", "triệu", "tỷ", "ngàn tỷ", "triệu tỷ"];
  let words = "";

  for (let i = 0; i < groups.length; i++) {
    let g = groups[i];
    let unitIndex = groups.length - 1 - i;
    if (g > 0) {
      let showZero = i > 0;
      let gWords = readThreeDigits(g, showZero);
      words += gWords + groupUnits[unitIndex] + " ";
    }
  }

  words = words.trim();
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1) + " đồng";
  }

  // Normalize spaces
  return words.replace(/\s+/g, ' ');
}

// Test cases
console.log("6480000 =>", numberToVietnameseWords(6480000));
console.log("7920000 =>", numberToVietnameseWords(7920000));
console.log("9520000 =>", numberToVietnameseWords(9520000));
console.log("10500000 =>", numberToVietnameseWords(10500000));
console.log("123456789 =>", numberToVietnameseWords(123456789));
