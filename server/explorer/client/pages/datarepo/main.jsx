import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Button from 'react-bootstrap/Button'

import {DataRepoEditor, DataRepoViewer} from '/components/business/datarepo'
import {PageHeader} from '/components/generic/page_tools'
import {saveDataRepo} from '/apis'

import $ from 'jquery'

import {get_csrf_token, get_current_user, get_app_context, get_tenant_id} from '/common_lib'

/*********************************************************************************
 * Purpose: Page to view a data repo
 *
 * Props
 *      datarepo    : the data repo to view
 *      current_user: the user who is viewing
 */

class DataRepoPage extends React.Component {
    theDataRepoEditorRef = React.createRef();

    saveDataRepoAndRefresh = (mode, datarepo) => {
        return saveDataRepo(
            get_csrf_token(),
            this.props.tenant_id,
            mode,
            datarepo
        ).then(() => {
            location.reload();
        });
    };

    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <PageHeader title="Data Repository">
                            {!!this.props.current_user && this.props.current_user.is_superuser &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={event => {
                                        this.theDataRepoEditorRef.current.openDialog({
                                            mode: "edit" ,
                                            datarepo: this.props.datarepo
                                        })
                                    }}
                                >
                                    Edit
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DataRepoViewer datarepo = {this.props.datarepo} />
                    </Col>
                </Row>
                <DataRepoEditor
                    ref={this.theDataRepoEditorRef}
                    onSave={this.saveDataRepoAndRefresh}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const app_context = get_app_context();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <DataRepoPage
            current_user={current_user}
            datarepo={app_context.datarepo}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});
