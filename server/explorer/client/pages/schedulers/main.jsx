import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {TimerTable} from '/components/business/timer/main.jsx'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, get_tenant_id, handle_json_response} from '/common_lib'
import { getTimers, saveTimer } from '../../apis'

class SchedulersPage extends React.Component {
    state = {
        timers: [],
    }

    onSave = (mode, timer) => {
        return saveTimer(
            get_csrf_token(),
            this.props.tenant_id,
            mode,
            timer
        ).then(() => {
            location.reload();
        });
    };

    get_page = (offset, limit, filter={}) => getTimers(
        this.props.tenant_id, offset, limit);

    render() {
        return (
            <Container fluid>
                <TimerTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    onSave={this.onSave}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <SchedulersPage
            current_user={current_user}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});
