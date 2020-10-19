import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import {get_app_context, get_current_user} from '/common_lib'

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
    const current_user = get_current_user()
    const app_context = get_app_context();

    ReactDOM.render(
        <Pipeline current_user={current_user} pipeline={app_context.pipeline}/>,
        document.getElementById('app')
    );
});
