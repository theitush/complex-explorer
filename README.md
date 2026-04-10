# Complex Explorer

A web application for visualizing and exploring complex functions on the complex plane. Built with React and Vite.<br>
Original concept and design by Claude Opus 4.6

## Features

- **Expression Input**: Enter complex function expressions using standard mathematical notation
- **Visual Exploration**: Interactive visualization of complex functions with real-time updates
- **Coordinate Modes**: Switch between Cartesian and polar coordinate representations
- **Presets**: Quick access to common complex functions like z², eᶻ, sin(z), etc.
- **Grid and Mesh**: Toggleable grid lines and mesh for better visualization
- **Polar Coordinates**: Display radius and angle information
- **Responsive Design**: Works on various screen sizes

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd complex-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the development server:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal).

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Supported Functions

The application supports various complex functions including:
- Basic arithmetic: +, -, *, /, ^
- Trigonometric: sin, cos, tan
- Hyperbolic: sinh, cosh, tanh
- Exponential: exp, log, ln
- Powers and roots: pow, sqrt
- Complex-specific: conj (conjugate), re (real part), im (imaginary part)
- Constants: i, e, pi, phi

## Examples

- `z^2`: Plots z squared
- `sin(z)`: Sine function in complex plane
- `exp(z)`: Exponential function
- `(z^2+1)/(z^2-1)`: Rational function

## Tech Stack

- **React**: UI framework
- **Vite**: Build tool and development server
- **JavaScript**: Programming language

</content>
<parameter name="filePath">
