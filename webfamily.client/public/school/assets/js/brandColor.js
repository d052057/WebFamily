/*
 * Author: Yitong Phou
 * This is the main oject to create daily color object
 */

/*------------ This is another way to do OBJECT in Javascript or Javascript function object (NOT USED)--------------*/
/*
 * init variable
 * rgb {r,g,b}
 */
//var brandColor = {
//     red: 0,
//     green: 0,
//     blue: 0,
//     hexColor: 'undefined',
//     colors =['#221924', '#004422', '#062751', '#F78914', '#990000', '#708238', '#6a0dad'];
//     get todayColor() {
//          return this.red + "," + this.green + "," + this.blue;
//     },
//     get getTodayHexColor() {
//          return this.hexColor;
//     },
//     set setHex2Rgb(hex) {
//          var m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
//          this.red = parseInt(m[1], 16);
//          this.green = parseInt(m[2], 16);
//          this.blue = parseInt(m[3], 16);
//          this.hexColor = hex;
//     },
//     set setRgb2Hex(rgb) {
//          // split rgb to red, green and blue - rgb = '1,2,3'
//          [this.red, this.green, this.blue] = rgb.split(",");
//          this.hexColor = '#';
//          this.hexColor += Math.abs(this.red).toString(16).padStart(2, '0');
//          this.hexColor += Math.abs(this.green).toString(16).padStart(2, '0')
//          this.hexColor += Math.abs(this.blue).toString(16).padStart(2, '0')
//          //this.hexColor = "#" + ((1 << 24) + (this.red << 16) + (this.green << 8) + this.blue).toString(16).slice(1);
//     },
//     setRgba2hex: function (rgb, a) {
//          var hex = '';
//          var opacity;
//          var alpha;
//          var c = rgba.split(',');
//          hex = Math.abs(c[0]).toString(16).padStart(2, '0');
//          hex += Math.abs(c[1]).toString(16).padStart(2, '0');
//          hex += Math.abs(c[2]).toString(16).padStart(2, '0');
//          var opacity = parseFloat(a.trim());
//          if (opacity !== "") {
//               alpha = opacity;
//          } else {
//               alpha = 1;
//          }
//          // multiply before convert to HEX
//          alpha = ((alpha * 255) | 1 << 8).toString(16).slice(1)
//          hex += alpha;

//          return '#' + hex;
//     },
//     set setColorByDay(date) {
//          this.setHex2Rgb = this.colors[date.getDay()];
//     }

//};
/*-------------------------This is another way to do OBJECT/Class in Javascript with get and set----------------*/
/*
 * Colors array is not working with Ms-Edge.  Doing this way is to fix it for temporary until finding better way to do it.
 * Other methods are not used due to compability with MS-edge (8 digits hex colors).  The methods will be kept until 
 * Ms fix MS-Edge in the future.
 */

class dailyColor {
     constructor(r, g, b) {
          this.red = r;
          this.green = g;
          this.blue = b;
          this.color = this.getDefaultColors();
          this.hexColor = '#';
          this.hexColor += Math.abs(this.red).toString(16).padStart(2, '0');
          this.hexColor += Math.abs(this.green).toString(16).padStart(2, '0');
          this.hexColor += Math.abs(this.blue).toString(16).padStart(2, '0');
     }
     get getColorByDay() {
          return this.red + "," + this.green + "," + this.blue;
     }
     get getTodayHexColor() {
          return this.hexColor;
     }
     get getHexColors() {
          return this.colors;
     }
     /**
      * @param {{ getDay: () => any; }} date
      */
     set setColorByDay(date) {     
          this.setColorByIndex = date.getDay();
     }
     /**
      * @param {string | number} weekDay
      */
     set setColorByIndex(weekDay) {
          if ((this.colors == 'undefined' || this.colors == null)) {
               this.colors = this.getDefaultColors();
          }
          // this.setHex2Rbg = 0 or 1 or 2...6 and the color won't rotate
          // this.setHex2Rgb = this.colors[0]; // Sunday color all the times
          this.setHex2Rgb = this.colors[weekDay];
          document.documentElement.style.setProperty('--todayColor', this.getColorByDay);
          document.documentElement.style.setProperty('--txtColor', this.textColor);
     }
     /**
      * @param {string} hex
      */
     set setHex2Rgb(hex) {
          var rgbColor = this.getHex2Rgb(hex);
 
          this.red = rgbColor[0];
          this.green = rgbColor[1];
          this.blue = rgbColor[2];
          this.hexColor = hex;
     }
     /**
      * @param {{ split: (arg0: string) => [any, any, any]; }} rgb
      */
     set setRgb2Hex(rgb) {
          // split rgb to red, green and blue - rgb = '1,2,3'
          [this.red, this.green, this.blue] = rgb.split(",");
          this.hexColor = '#';

          this.hexColor += Math.abs(this.red).toString(16).padStart(2, '0');
          this.hexColor += Math.abs(this.green).toString(16).padStart(2, '0');
          this.hexColor += Math.abs(this.blue).toString(16).padStart(2, '0');
          // this.hexColor = "#" + ((1 << 24) + (this.red << 16) + (this.green << 8) + this.blue).toString(16).slice(1);
     }
     getHex2Rgb(hex) {
          var m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
          // return array;
          return [parseInt(m[1], 16) ,parseInt(m[2], 16) , parseInt(m[3], 16)];
     }
     getDefaultColors() {
          return ('#221924,#004422,#062751,#F78914,#990000,#708238,#6a0dad').split(',');
     }
     // rgb = '1,2,3'
     // a (alpha) = .1 thru .9
     // convert rgb and alpha to 8 digit hex color. works with chrome but MS-Edge
     setRgba2hex(rgb, a) {
          var hex = '';
          var opacity;
          var alpha;
          var c = rgb.split(',');

          hex = Math.abs(c[0]).toString(16).padStart(2, '0');
          hex += Math.abs(c[1]).toString(16).padStart(2, '0');
          hex += Math.abs(c[2]).toString(16).padStart(2, '0');
          var opacity = parseFloat(a);
          if (opacity !== "") {
               alpha = opacity;
          } else {
               alpha = 1;
          }
          // multiply before convert to HEX
          alpha = Math.round(alpha * 100) / 100;
          alpha = Math.round(alpha * 255);
          var hexAlpha = (alpha + 0x10000).toString(16).substr(-2).toUpperCase();
          hex += hexAlpha;

          return '#' + hex;
     }
}
/*
 * Ther is no need do 'extends' but want to experience/use extends and super in javascript class.
 * get and set are the same as get/set property in C#.
 * get and set work much much better and function or method.
*/
class brandColor extends dailyColor {
     constructor(red, green, blue, textColor) {
          super(red, green, blue)
          this.textColor = (!textColor) ? '#F5F5F5': textColor ;
     }
     // update to CSS
     /**
      * @param {any} date
      */
     set setColorByDay(date) {
          // init base
          super.setColorByDay = date;
          var rgb = this.red + ',' + this.green + ',' + this.blue;
          rgb = this.getHex2Rgb(this.colors[0]).join(',');
          document.documentElement.style.setProperty('--sunColor', rgb);
          this.colorSunRgbToHexShade = rgb;
          rgb = this.getHex2Rgb(this.colors[1]).join(',');
          document.documentElement.style.setProperty('--monColor', rgb);
          this.colorMonRgbToHexShade = rgb;
          rgb = this.getHex2Rgb(this.colors[2]).join(',');
          document.documentElement.style.setProperty('--tueColor', rgb);
          this.colorTueRgbToHexShade = rgb;

          rgb = this.getHex2Rgb(this.colors[3]).join(',');
          document.documentElement.style.setProperty('--wedColor', rgb);
          this.colorWedRgbToHexShade = rgb;

          rgb = this.getHex2Rgb(this.colors[4]).join(',');
          document.documentElement.style.setProperty('--thuColor', rgb);
          this.colorThuRgbToHexShade = rgb;

          rgb = this.getHex2Rgb(this.colors[5]).join(',');
          document.documentElement.style.setProperty('--friColor', rgb);
          this.colorFriRgbToHexShade = rgb;

          rgb = this.getHex2Rgb(this.colors[6]).join(',');
          document.documentElement.style.setProperty('--satColor', rgb);
          this.colorSatRgbToHexShade = rgb;

     }
     // set text color manually
     /**
      * @param {any} hexColor
      */
     set setTextColor(hexColor) {
          this.textColor = hexColor;
     }
     get getTextColor() {
          return this.textColor;
     }
}
/**
 * Init daily Theme from index.html (first time - required)
 * @param {*} ddColor 
 */
function initColors(ddColor) {
     ddColor.setColorByDay = new Date();
     document.documentElement.style.setProperty('--todayColor', ddColor.getColorByDay);
     document.documentElement.style.setProperty('--txtColor', ddColor.textColor);
}