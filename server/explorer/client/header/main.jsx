import React from 'react';
import ReactDOM from 'react-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import DropdownButton from 'react-bootstrap/DropdownButton'
import Dropdown from 'react-bootstrap/Dropdown'
import $ from 'jquery';


import {get_current_user, get_tenant_id, get_nav_item_role} from '/common_lib';
import "./header.scss";

class MyNavLink extends React.Component {
    render() {
        return <Nav.Link
            href={this.props.href}
            className={this.props.role===this.props.current_role?'active-link':''}
        >
            {
                this.props.children
            }
        </Nav.Link>;
    }
}

class GlobalHeader extends React.Component {
    render() {
        return <Navbar fixed="top" expand="sm" variant="dark">
            <Navbar.Brand href="#">
                <img
                    src="/static/images/logo.png"
                    alt="Logo"
                    className="d-inline-block align-top"
                />
                <span className="font-weight-bold">
                    Data Manager
                </span>

            </Navbar.Brand>
            <Nav className="mr-auto">
                {
                    this.props.current_user &&
                    <MyNavLink
                        href={`/explorer/datalakes`}
                        role="datalakes"
                        current_role={this.props.nav_item_role}
                    >
                        Datalakes
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/datasets`}
                        role="datasets"
                        current_role={this.props.nav_item_role}
                    >
                        Datasets
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/pipelines`}
                        role="pipelines"
                        current_role={this.props.nav_item_role}
                    >
                        Pipelines
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/executions`}
                        role="executions"
                        current_role={this.props.nav_item_role}
                    >
                        Executions
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/applications`}
                        role="applications"
                        current_role={this.props.nav_item_role}
                    >
                        Applications
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/schedulers`}
                        role="schedulers"
                        current_role={this.props.nav_item_role}
                    >
                        Schedulers
                    </MyNavLink>
                }
                {
                    this.props.current_user && this.props.tenant_id &&
                    <MyNavLink
                        href={`/explorer/${this.props.tenant_id}/datarepos`}
                        role="datarepos"
                        current_role={this.props.nav_item_role}
                    >
                        Data Repositories
                    </MyNavLink>
                }

                <Nav.Link
                    href={`https://github.com/stonezhong/DataManager/wiki/Document-one-page`}
                >
                    Document
                </Nav.Link>

                {
                    !this.props.current_user &&
                    <MyNavLink
                        href={`/explorer/login`}
                        role="login"
                        current_role={this.props.nav_item_role}
                    >
                        Login
                    </MyNavLink>
                }

                {
                    !this.props.current_user &&
                    <MyNavLink
                        href={`/explorer/signup`}
                        role="signup"
                        current_role={this.props.nav_item_role}
                    >
                        Signup
                    </MyNavLink>
                }

            </Nav>
            {
                this.props.current_user &&
                <DropdownButton title={this.props.current_user.name} variant="light">
                    <Dropdown.Item href="/explorer/logout">
                        Logout
                    </Dropdown.Item>
                </DropdownButton>
            }
        </Navbar>;
    }
}

$(function() {
    const current_user = get_current_user();
    const tenant_id = get_tenant_id();
    const nav_item_role = get_nav_item_role();

    ReactDOM.render(
        <GlobalHeader
            current_user={current_user}
            tenant_id={tenant_id}
            nav_item_role={nav_item_role}
        />,
        document.getElementById('global-header')
    );
});
