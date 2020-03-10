const path = require('path'),
  HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './app.js',
  output: {
    path: path.resolve(__dirname, "public/"),
    publicPath: '/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "HyPhy Coronavirus Visualization"
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ] 
      }
    ],
  },
  devServer: {
    host: '0.0.0.0',
    historyApiFallback: true,
    disableHostCheck: true,
    contentBase: 'public'
  }
}
