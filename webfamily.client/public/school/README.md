# web-project-d052057
This project is created for a Javascript/Jquery class in Lake Washington Technical Institute.
I have chosen this project because I like to try the new CSS 4 feature, variables in CSS which allow me to change css properties via variables.
This project, it happened I have chosen the color schemes with Bootstrap framework, because I don't like hard coding.
The new way, It will easy and save a lot of hours of coding. To do this, I have to create a Javascript class (brandColor.js).  
The class will create color properties by day and other color conversion methods to use with CSS and HTML.
just like any object or class, initialized is needed. The initialization process is in initBrandColor.js.
Bootstrap framework does have its own color schemes and I have created several CSS files as an example to use daily theme in this website.
The site.css file is mainly for overwriting Bootstrap color themes. This is just a sample to demo this website.
The brandColor.css is daily theme CSS variables used by brandColor.js (javascript class).
The customColors.css is the custom CSS used in this website. 

To incorporate daily theme in a website:  
You need to add these lines of codes in your html &lt;head> section.
	<!-- bootstrap and jquery requirements -->
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">     
    <script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>

	<!-- daily js and css requirements -->
     <link rel="stylesheet" href="styles/brandColor.css" />
     <link rel="stylesheet" href="styles/customColors.css" />
     <link rel="stylesheet" href="styles/site.css" />
     <script src="js/brandColor.js"></script>
     <script src="js/initBrandColor.js"></script>
     <script src="js/site.js"></script>

In the html body section, there is no change to bootstrap framework and here is an example code I copy and paste to this website.
      <pre>
	  &lt;div class="row input-group mb-3" id="btnDiv">
      &lt;div class="col-md-1">
               &lt;button type="button" class="btn">Submit&lt;/button>
          &lt;/div>
          &lt;div class="col-md-1">
               &lt;button type="button" class="btn btn-outline">Submit&lt;/button>
          &lt;/div>
          &lt;div class="col-md-10">
          &lt;/div>
     &lt;/div> 
	 </pre>
	 ...
To change color using CSS variable in Jquery
	<pre>
	$(selector).css("background-color", "rgb(var(--todayColor))");
	</pre>
To change color definitions in the brandColor.js, look for a method getDefaultColors() which returns and array of colors
<pre>
getDefaultColors()
	{
        return ('#221924,#004422,#062751,#F78914,#990000,#708238,#6a0dad').split(',');
	}
</pre>
To stop daily theme not to rotate
<pre>
     set setColorByDay(date) {
          if ((this.colors == 'undefined' || this.colors == null)) {
               this.colors = this.getDefaultColors();
          }
          // 0 is Sunday, 1, 2, 4 ... and 6 is Saturday
          this.setHex2Rgb = this.colors[0]; <======= this will stop rotating and use Sunday color
          this.setHex2Rgb = this.colors[date.getDay()]; <======== this rotate as default
     }
</pre>
Since this is a proof of concept, I am not planning to create a CSS file to use it with the whole Bootstrap framework. But it is not hard to do, just search for any CSS properties such as border-color, background, background-color, color and change them with CSS variables then you have your own theme.

Yitong Phou