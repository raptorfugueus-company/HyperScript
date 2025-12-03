# HyperScript (HS) ✨

HyperScript (HS) is a simple and intuitive markup language designed to inject dynamic functionalities directly into your HTML, minimizing the need for complex JavaScript code. It leverages custom HTML tags to enable powerful DOM manipulation, variable management, conditional logic, and looping structures, all within your existing HTML structure.

## Description 🚀

HyperScript aims to simplify frontend development by allowing you to express complex logic using understandable HTML tags. This approach enhances simplicity, accelerates development by integrating dynamic features without intricate JavaScript, and comes with comprehensive documentation to guide you every step of the way. It empowers developers to create interactive web experiences efficiently and declaratively.

## Features 🌟

HyperScript offers a rich set of custom HTML tags for various dynamic operations:

*   📦 **`<hs-var>`**: Declares a global variable (or local within an `<hs-group>`).
*   ✏️ **`<hs-set>`**: Modifies the value of an existing variable.
*   ➕➖✖️➗ **`<hs-math>`**: Calculates an expression and stores the result in a variable.
*   🎲 **`<hs-random>`**: Generates a random number within a specified interval and stores it.
*   📝 **`<hs-print>`**: Displays the value of a variable or an expression directly in the HTML.
*   🤔 **`<hs-if>` / `<hs-else>`**: Implements conditional rendering based on an expression.
*   🔄 **`<hs-for>`**: Executes a block of HTML content repeatedly with a counter.
*   💻 **`<hs-log>`**: Prints the value of a variable or expression to the browser console.
*   👀 **`<hs-show>`**: Displays an element only if a specified condition is true.
*   🙈 **`<hs-hide>`**: Hides an element if a specified condition is true.
*   🎨 **`<hs-addclass>`**: Adds a CSS class to a targeted HTML element.
*   🗑️🎨 **`<hs-removeclass>`**: Removes a CSS class from a targeted HTML element.
*   ⚙️ **`<hs-attr>`**: Modifies an HTML attribute of a targeted element.
*   ⚡ **`<hs-on>`**: Triggers a sequence of HyperScript actions on a specified DOM event.
*   🔁 **`<hs-repeat>`**: Repeats a block of content a fixed number of times, with an optional iteration variable.
*   ⏳ **`<hs-while>`**: Repeats a block of HTML content as long as a condition remains true.
*   🚦 **`<hs-switch>` / `<hs-case>`**: Provides multiple conditional choices, similar to a switch statement.
*   📁 **`<hs-group>`**: Groups multiple HyperScript tags, creating a local scope for variables within the group.

## Technologies Used 💻

*   **JavaScript**: The core language powering HyperScript for DOM manipulation, expression evaluation, and logical operations.

## Installation ⬇️

To use HyperScript, simply include the provided JavaScript file in your HTML document. You can place it either in the `<head>` or at the end of the `<body>` before the closing `</body>` tag.

**Include in HTML**: Link `https://hyperscript-rf.vercel.app/js/hyperScriptEngine.js` in your HTML file.

```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My HyperScript App</title>
        <script src="https://hyperscript-rf.vercel.app/js/hyperScriptEngine.js"></script>
    </head>
    <body>
        <!-- Your HTML content with HyperScript tags -->

    </body>
    </html>
 ```

## Usage 💡

Once included, HyperScript will automatically parse your HTML document for custom `hs-` tags upon `DOMContentLoaded`.

Here's a simple example demonstrating how to declare variables, perform a calculation, and display results:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HyperScript Example</title>
    <script src="https://hyperscript-rf.vercel.app/js/hyperScriptEngine.js"></script>
    <style>
        .highlight {
            color: blue;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <h1>Welcome to HyperScript!</h1>

    <!-- Declare a variable 'x' with value 10 -->
    <hs-var name="x" value="10"></hs-var>
    <p>Initial value of x: <hs-print value="x"></hs-print></p>

    <!-- Modify 'x' by adding 5 -->
    <hs-set name="x" value="x + 5"></hs-set>
    <p>x after modification: <hs-print value="x"></hs-print></p>

    <!-- Calculate a mean and store it in 'moyenne' -->
    <hs-math result="moyenne" expr="(x + 20) / 2"></hs-math>
    <p>Moyenne: <hs-print value="moyenne"></hs-print></p>

    <!-- Conditional rendering -->
    <hs-if condition="x > 10">
        <p>🎉 x is greater than 10!</p>
        <hs-else>
            <p>😕 x is 10 or less.</p>
        </hs-else>
    </hs-if>

    <!-- Loop example -->
    <h2>Counting with hs-for:</h2>
    <hs-for loop="let i=1; i<=3; i++">
        <p>Iteration n°<hs-print value="i"></hs-print></p>
    </hs-for>

    <!-- Event handling and class manipulation -->
    <div id="box" style="border: 1px solid black; padding: 10px; margin-top: 20px;">
        Click the button to highlight me!
    </div>
    <button id="btn">Click me</button>
    <hs-on event="click" target="#btn">
        <hs-addclass target="#box" class="highlight"></hs-addclass>
        <hs-log value="'Button clicked!'"></hs-log>
    </hs-on>

</body>
</html>
```

Open this HTML file in your browser, and you will see the dynamic content rendered by HyperScript without writing any traditional JavaScript.
