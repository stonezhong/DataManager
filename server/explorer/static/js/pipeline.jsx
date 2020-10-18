import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import {get_app_context} from './common_lib'

class Pipeline extends React.Component {
    render() {
        return (
            <div>
                <h1>Pipeline</h1>
            </div>
        );
    }
}

$(function() {
    const username = document.getElementById('app').getAttribute("data-username");
    const app_context = get_app_context();

    ReactDOM.render(
        <Pipeline username={username} pipeline={app_context.pipeline}/>,
        document.getElementById('app')
    );
});
