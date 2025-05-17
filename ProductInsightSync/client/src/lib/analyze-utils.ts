/**
 * Calculate the Pearson correlation coefficient between two variables
 * @param data Array of data objects
 * @param var1 First variable name
 * @param var2 Second variable name
 * @returns Correlation coefficient and strength description
 */
export function calculateCorrelation(data: any[], var1: string, var2: string) {
  // Filter out any objects with missing values
  const validData = data.filter(
    item => 
      item[var1] !== undefined && 
      item[var1] !== null && 
      item[var2] !== undefined && 
      item[var2] !== null &&
      !isNaN(Number(item[var1])) &&
      !isNaN(Number(item[var2]))
  );
  
  if (validData.length < 3) {
    return { coefficient: 0, strength: "Insufficient data" };
  }
  
  // Convert string values to numbers
  const values1 = validData.map(item => Number(item[var1]));
  const values2 = validData.map(item => Number(item[var2]));
  
  // Calculate means
  const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
  const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
  
  // Calculate correlation coefficient
  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;
  
  for (let i = 0; i < values1.length; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denominator1 * denominator2);
  
  if (denominator === 0) {
    return { coefficient: 0, strength: "No variation in data" };
  }
  
  const coefficient = numerator / denominator;
  
  // Determine strength of correlation
  let strength;
  const absCoef = Math.abs(coefficient);
  
  if (absCoef >= 0.9) {
    strength = "Very strong";
  } else if (absCoef >= 0.7) {
    strength = "Strong";
  } else if (absCoef >= 0.5) {
    strength = "Moderate";
  } else if (absCoef >= 0.3) {
    strength = "Weak";
  } else {
    strength = "Very weak or none";
  }
  
  if (coefficient > 0) {
    strength += " positive correlation";
  } else if (coefficient < 0) {
    strength += " negative correlation";
  }
  
  return { coefficient, strength };
}

/**
 * Calculate linear regression parameters for trend analysis
 * @param xValues X values (independent variable)
 * @param yValues Y values (dependent variable)
 * @returns Slope, intercept, and R^2 value of the regression line
 */
export function getLinearRegression(xValues: number[], yValues: number[]) {
  // Ensure arrays are of equal length
  const n = Math.min(xValues.length, yValues.length);
  
  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0 };
  }
  
  // Calculate means
  let sumX = 0;
  let sumY = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
  }
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = xValues[i] - meanX;
    numerator += diffX * (yValues[i] - meanY);
    denominator += diffX * diffX;
  }
  
  if (denominator === 0) {
    return { slope: 0, intercept: meanY, r2: 0 };
  }
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // Calculate R^2 (coefficient of determination)
  let totalSS = 0;
  let residualSS = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    totalSS += Math.pow(yValues[i] - meanY, 2);
    residualSS += Math.pow(yValues[i] - predicted, 2);
  }
  
  const r2 = totalSS === 0 ? 0 : 1 - (residualSS / totalSS);
  
  return { slope, intercept, r2 };
}

/**
 * Detect outliers in a dataset using the IQR method
 * @param values Array of numeric values
 * @returns Array of outlier values
 */
export function detectOutliers(values: number[]) {
  // Sort the values
  const sortedValues = [...values].sort((a, b) => a - b);
  const n = sortedValues.length;
  
  if (n < 4) {
    return []; // Not enough data to detect outliers
  }
  
  // Calculate quartiles
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  
  const q1 = sortedValues[q1Index];
  const q3 = sortedValues[q3Index];
  
  // Calculate IQR and outlier thresholds
  const iqr = q3 - q1;
  const lowerThreshold = q1 - 1.5 * iqr;
  const upperThreshold = q3 + 1.5 * iqr;
  
  // Find outliers
  return values.filter(value => value < lowerThreshold || value > upperThreshold);
}

/**
 * Bin continuous data into categories for visualization
 * @param values Array of numeric values
 * @param binCount Number of bins to create
 * @returns Array of bin objects with start, end, and count properties
 */
export function binData(values: number[], binCount = 5) {
  if (values.length === 0) {
    return [];
  }
  
  // Determine min and max values
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (min === max) {
    return [{ start: min, end: max, count: values.length }];
  }
  
  // Create bins
  const binWidth = (max - min) / binCount;
  const bins = Array(binCount).fill(0).map((_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0
  }));
  
  // Assign values to bins
  values.forEach(value => {
    // Edge case: if value is exactly max, put it in the last bin
    if (value === max) {
      bins[binCount - 1].count++;
      return;
    }
    
    const binIndex = Math.floor((value - min) / binWidth);
    bins[binIndex].count++;
  });
  
  return bins;
}

/**
 * Convert a column of data to numeric values when possible
 * @param data Array of data objects
 * @param column Column name to convert
 * @returns New array with the column converted to numbers when possible
 */
export function convertToNumeric(data: any[], column: string) {
  return data.map(item => {
    const newItem = { ...item };
    const value = item[column];
    
    if (value !== undefined && value !== null && !isNaN(Number(value))) {
      newItem[column] = Number(value);
    }
    
    return newItem;
  });
}

/**
 * Format a number for display
 * @param value Number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals = 2) {
  if (isNaN(value)) return 'N/A';
  
  // For very small numbers near zero
  if (Math.abs(value) < Math.pow(10, -decimals) && value !== 0) {
    return value.toExponential(decimals);
  }
  
  // For very large or very small numbers
  if (Math.abs(value) >= 10000 || Math.abs(value) <= 0.001) {
    return value.toExponential(decimals);
  }
  
  return value.toFixed(decimals);
}
