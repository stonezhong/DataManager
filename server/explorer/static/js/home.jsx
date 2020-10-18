import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

// This is a placeholder, I will improve the home page latter
class Home extends React.Component {
    render() {
        return (
            <div>
                <h1>Hello world!</h1>
            </div>
        )
    }
}

$(function() {
    ReactDOM.render(
        <Home />,
        document.getElementById('app')
    );
});
